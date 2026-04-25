import os
import json
from transformers import TrainingArguments
from trl import SFTTrainer
from unsloth import FastLanguageModel
import torch

def main():
    print("Initiating fine-tuning pipeline for Qwen2.5-Coder 1.5B using Unsloth (QLoRA)...")
    
    max_seq_length = 2048 # Choose any! We auto support RoPE Scaling internally!
    dtype = None # None for auto detection. Float16 for Tesla T4, V100, Bfloat16 for Ampere+
    load_in_4bit = True # Use 4bit quantization to reduce memory usage. Can be False.

    model_name = "Qwen/Qwen2.5-Coder-1.5B"
    
    print(f"Loading base model {model_name}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = model_name,
        max_seq_length = max_seq_length,
        dtype = dtype,
        load_in_4bit = load_in_4bit,
    )

    # Do model patching and add fast LoRA weights
    print("Adding LoRA adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r = 16, # Choose any number > 0 ! Suggested 8, 16, 32, 64, 128
        target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj",],
        lora_alpha = 16,
        lora_dropout = 0, # Supports any, but = 0 is optimized
        bias = "none",    # Supports any, but = "none" is optimized
        use_gradient_checkpointing = "unsloth", # True or "unsloth" for very long context
        random_state = 3407,
        use_rslora = False,
        loftq_config = None,
    )

    # Let's load the dataset from our data directory
    # Assume data is prepared in data/training_data.jsonl
    dataset_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'training_data.jsonl')
    
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}. Skipping training.")
        return

    print("Loading local JSONL dataset...")
    from datasets import load_dataset
    dataset = load_dataset('json', data_files=dataset_path, split='train')

    # Formatting function
    prompt_template = """<|im_start|>user
{}<|im_end|>
<|im_start|>model
{}<|im_end|>"""

    def formatting_prompts_func(examples):
        inputs = examples["prompt"]
        outputs = examples["response"]
        texts = []
        for i, o in zip(inputs, outputs):
            text = prompt_template.format(i, o)
            texts.append(text)
        return { "text" : texts, }
    
    dataset = dataset.map(formatting_prompts_func, batched = True,)

    print("Setting up Trainer...")
    trainer = SFTTrainer(
        model = model,
        tokenizer = tokenizer,
        train_dataset = dataset,
        dataset_text_field = "text",
        max_seq_length = max_seq_length,
        dataset_num_proc = 2,
        packing = False, # Can make training 5x faster for short sequences.
        args = TrainingArguments(
            per_device_train_batch_size = 2,
            gradient_accumulation_steps = 4,
            warmup_steps = 5,
            max_steps = 60, # Optional: just 60 steps for demonstration
            learning_rate = 2e-4,
            fp16 = not torch.cuda.is_bf16_supported(),
            bf16 = torch.cuda.is_bf16_supported(),
            logging_steps = 1,
            optim = "adamw_8bit",
            weight_decay = 0.01,
            lr_scheduler_type = "linear",
            seed = 3407,
            output_dir = "outputs",
        ),
    )

    print("Starting Training...")
    trainer_stats = trainer.train()

    print(trainer_stats)

    # Save the custom model adapters
    adapter_dir = "devbot-pro-adapter"
    print(f"Saving adapter to {adapter_dir}...")
    model.save_pretrained(adapter_dir)
    tokenizer.save_pretrained(adapter_dir)

    print("Fine-tuning pipeline completed successfully.")
    print("Run `ollama create devbot-pro -f Modelfile` using the saved GGUF format if needed.")

if __name__ == "__main__":
    main()
