from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import PyPDF2
import docx
from io import BytesIO

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    text: str
    difficulty: str = "medium"
    exam_mode: bool = False

@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """Extract text from PDF, Word, or TXT files"""
    try:
        contents = await file.read()
        
        if file.filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(BytesIO(contents))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return {"text": text.strip()}
        
        elif file.filename.endswith('.docx') or file.filename.endswith('.doc'):
            doc = docx.Document(BytesIO(contents))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return {"text": text.strip()}
        
        elif file.filename.endswith('.txt'):
            text = contents.decode('utf-8')
            return {"text": text.strip()}
        
        else:
            return {"error": "Unsupported file format. Use PDF, Word, or TXT."}
    
    except Exception as e:
        return {"error": f"Failed to extract text: {str(e)}"}

@app.post("/generate")
async def generate_flashcards(request: GenerateRequest):
    print("✅ /generate endpoint received request")
    print(f"📝 Text length: {len(request.text)} characters")
    print(f"⚙️ Difficulty: {request.difficulty}, Exam mode: {request.exam_mode}")
    
    try:
        # Build difficulty instructions
        difficulty_instructions = {
            "easy": "Create SIMPLE flashcards with basic vocabulary, clear definitions, and short 1-2 sentence answers.",
            "medium": "Create BALANCED flashcards with moderate complexity, 2-4 sentence explanations, and clear connections.",
            "hard": "Create ADVANCED flashcards with complex concepts, detailed 4-6 sentence explanations, and analytical questions."
        }

        exam_mode_instruction = ""
        if request.exam_mode:
            exam_mode_instruction = """
Include test-style questions:
- Multiple choice (provide 4 options, mark correct with ✓)
- True/False questions  
- Fill-in-the-blank
- Short answer
Mix these question types.
"""

        # For very long texts (>5000 words), split into chunks
        text_length = len(request.text.split())
        
        if text_length > 1500:
            print(f"⚠️ Large text detected ({text_length} words). Processing in chunks...")
            # Split into ~3000 word chunks
            words = request.text.split()
            chunk_size = 3000
            chunks = [' '.join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
            
            all_flashcards = []
            
            for idx, chunk in enumerate(chunks):
                print(f"📦 Processing chunk {idx + 1}/{len(chunks)}")
                
                # Calculate cards per chunk
                cards_for_chunk = max(8, len(chunk.split()) // 120)
                print(f"Chunk words: {len(chunk.split())}, Cards target: {cards_for_chunk}")
                
                prompt = f"""You are an expert flashcard generator.

DIFFICULTY: {request.difficulty.upper()}
{difficulty_instructions[request.difficulty]}

{exam_mode_instruction}

STUDY MATERIAL (Part {idx + 1} of {len(chunks)}):
{chunk}

TASK: Generate approximately {cards_for_chunk} flashcards from this section.

You MUST include a mix of different question types:
- At least 20% multiple choice questions
- At least 20% true/false questions
- At least 20% fill-in-the-blank questions
- The rest can be short answer

Do NOT generate only one type of question. A mix is REQUIRED.

Use these EXACT JSON formats:
For MCQ:
{{"question": "...", "options": ["A", "B", "C", "D"], "answer": "correct option"}}

For True/False:
{{"question": "...", "answer": "True"}}
or
{{"question": "...", "answer": "False"}}

For Fill in the blank:
{{"question": "The capital of France is ____.", "answer": "Paris"}}

For Short Answer:
{{"question": "...", "answer": "..."}}

CRITICAL: Return ONLY a valid JSON array, nothing else:
[
  {{"question": "What is X?", "answer": "X is..."}},
  {{"question": "Which option describes Y correctly?", "options": ["A", "B", "C", "D"], "answer": "B"}},
  {{"question": "Y is always classified as Z.", "answer": "True"}},
  {{"question": "The process of photosynthesis occurs in ____.", "answer": "chloroplasts"}}
]

No markdown, no code blocks, no extra text - ONLY the JSON array."""

                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": "llama3.1:8b",
                        "prompt": prompt,
                        "stream": False
                    }
                )

                if response.status_code != 200:
                    print(f"Status: {response.status_code}")
                    print(f"Response: {response.text}")
                    return {"error": "Ollama API error"}

                if response.status_code == 200:
                    data = response.json()
                    response_text = data.get("response", "").strip()
                    
                    # Clean and parse
                    if "```json" in response_text:
                        start = response_text.find("```json") + 7
                        end = response_text.find("```", start)
                        response_text = response_text[start:end].strip()
                    elif "```" in response_text:
                        start = response_text.find("```") + 3
                        end = response_text.find("```", start)
                        response_text = response_text[start:end].strip()
                    
                    start_idx = response_text.find('[')
                    end_idx = response_text.rfind(']') + 1
                    
                    if start_idx != -1 and end_idx > start_idx:
                        response_text = response_text[start_idx:end_idx]
                        chunk_cards = json.loads(response_text)
                        if isinstance(chunk_cards, list):
                            all_flashcards.extend(chunk_cards)
                            print(f"✅ Chunk {idx + 1} generated {len(chunk_cards)} flashcards")
            
            if len(all_flashcards) == 0:
                return {"error": "Failed to generate flashcards from chunks. Try shorter text."}
            
            print(f"✅ Total generated: {len(all_flashcards)} flashcards from {len(chunks)} chunks")
            return {"flashcards": all_flashcards}
        
        else:
            # Normal processing for shorter texts
            prompt = f"""You are an expert flashcard generator.

DIFFICULTY: {request.difficulty.upper()}
{difficulty_instructions[request.difficulty]}

{exam_mode_instruction}

STUDY MATERIAL:
{request.text}

TASK: Analyze the text and generate an ADEQUATE number of flashcards to cover all important concepts. 

GUIDELINES:
- Short text (under 200 words): Generate ATLEAST 5-8 flashcards
- Medium text (200-500 words): Generate ATLEAST 8-15 flashcards
- Long text (500-1000 words): Generate ATLEAST 15-25 flashcards
- Very long text (1000+ words): Generate ATLEAST 25-40 flashcards

Cover ALL key concepts, definitions, important facts, and explanations.

CRITICAL: Ensure EVERY flashacrd has a complete, non-empty and reasonable answer.

You MUST include a mix of different question types:
- At least 20% multiple choice questions
- At least 20% true/false questions
- At least 20% fill-in-the-blank questions
- The rest can be short answer

Do NOT generate only one type of question. A mix is REQUIRED.

Use these EXACT JSON formats:
For MCQ:
{{"question": "...", "options": ["A", "B", "C", "D"], "answer": "correct option"}}

For True/False:
{{"question": "...", "answer": "True"}}
or
{{"question": "...", "answer": "False"}}

For Fill in the blank:
{{"question": "The capital of France is ____.", "answer": "Paris"}}

For Short Answer:
{{"question": "...", "answer": "..."}}

CRITICAL: Return ONLY a valid JSON array, nothing else:
[
  {{"question": "What is X?", "answer": "X is..."}},
  {{"question": "Which option describes Y correctly?", "options": ["A", "B", "C", "D"], "answer": "B"}},
  {{"question": "Y is always classified as Z.", "answer": "True"}},
  {{"question": "The process of photosynthesis occurs in ____.", "answer": "chloroplasts"}}
]

No markdown, no code blocks, no extra text - ONLY the JSON array."""

            print("🤖 Sending request to Ollama...")
            
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3.1:8b",
                    "prompt": prompt,
                    "stream": False
                }
            )

            print(f"📡 Ollama response status: {response.status_code}")

            if response.status_code != 200:
                print("❌ Ollama returned error status")
                print(f"Status: {response.status_code}")
                print(f"Response: {response.text}")
                return {"error": "Ollama API error"}

            data = response.json()
            response_text = data.get("response", "").strip()
            
            print(f"📄 Raw response length: {len(response_text)} chars")
            print(f"🔍 First 200 chars: {response_text[:200]}")
            
            # Clean up response
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            
            if start_idx == -1 or end_idx <= start_idx:
                print("❌ No JSON array found in response")
                return {"error": "AI didn't return valid format. Try again."}
            
            response_text = response_text[start_idx:end_idx]
            
            print(f"🧹 Cleaned JSON: {response_text[:200]}...")
            
            flashcards = json.loads(response_text)
            flashcards = [
                card for card in flashcards
                if card.get("question") and card.get("answer") and card.get("answer").strip() !=""
            ]
            
            if not isinstance(flashcards, list):
                print("❌ Response is not a list")
                return {"error": "Invalid AI response format."}
            
            if len(flashcards) == 0:
                print("❌ Empty flashcard list")
                return {"error": "No flashcards generated. Add more text."}
            
            print(f"✅ Successfully generated {len(flashcards)} flashcards")
            return {"flashcards": flashcards}

    except requests.exceptions.ConnectionError as e:
        print(f"❌ Cannot connect to Ollama: {e}")
        return {"error": f"Generation failed: {str(e)}"}
    
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return {"error": "Request took too long. Try shorter text or split your PDF into sections."}
    
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        return {"error": "AI response couldn't be parsed. Try again or use different model."}
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return {"error": f"Generation failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FastAPI server...")
    print("📋 Make sure Ollama is running locally on port 11434.")
    uvicorn.run(app, host="127.0.0.1", port=8000)
