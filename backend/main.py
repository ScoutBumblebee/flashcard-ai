from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import time
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


class ChunkRequest(BaseModel):
    text: str
    chunk_index: int
    total_chunks: int
    difficulty: str = "medium"
    exam_mode: bool = False


seen_chunk_questions = set()


def get_difficulty_instructions():
    return {
        "easy": "Create SIMPLE flashcards with basic vocabulary, clear definitions, and short 1-2 sentence answers.",
        "medium": "Create BALANCED flashcards with moderate complexity, 2-4 sentence explanations, and clear connections.",
        "hard": "Create ADVANCED flashcards with complex concepts, detailed 4-6 sentence explanations, and analytical questions."
    }


def get_exam_mode_instruction(exam_mode: bool):
    if exam_mode:
        return """
Include test-style questions:
- Multiple choice (provide exactly 4 options and one correct answer)
- True/False questions  
- Fill-in-the-blank
- Short answer
You MUST include all four question types in every chunk response.
You MUST follow this target distribution as closely as possible:
- 40% short answer
- 30% multiple choice
- 20% true/false
- 10% fill in the blank
Do NOT return only short-answer cards.
"""

    return """
Focus primarily on short-answer flashcards.
You may include a few multiple choice, true/false, and fill-in-the-blank cards, but most cards should be short answer.
"""


def build_question_mix_instruction(exam_mode: bool, minimum_cards: int):
    if exam_mode:
        return f"""
VARIETY REQUIREMENT:
- Generate at least {minimum_cards} flashcards.
- Include all four types in this chunk.
- Follow this target mix as closely as possible:
  - 40% short answer
  - 30% multiple choice
  - 20% true/false
  - 10% fill in the blank
- Do not let short answer dominate the entire set.
- Multiple choice cards must use this exact structure:
  {{"question": "...", "options": ["A", "B", "C", "D"], "answer": "correct option"}}
- Fill-in-the-blank cards must replace the key word or phrase with "____" in the question.
- Return at least 1 MCQ, 1 True/False, and 1 fill-in-the-blank whenever the chunk is large enough.
"""

    return f"""
VARIETY REQUIREMENT:
- Generate at least {minimum_cards} flashcards.
- Most cards should be short answer.
- Include at least 1 non-short-answer card when possible.
- If you include multiple choice, it must have exactly 4 options.
"""


def normalize_question(question: str):
    return " ".join(question.strip().lower().split())


def get_card_type(card):
    if card.get("options") and len(card.get("options", [])) == 4:
        return "mcq"
    if card.get("answer") == "True" or card.get("answer") == "False":
        return "true_false"
    if "____" in card.get("question", ""):
        return "fill_blank"
    return "short"


def has_required_exam_mix(flashcards):
    card_types = {get_card_type(card) for card in flashcards}
    required_types = {"short", "mcq", "true_false", "fill_blank"}
    return required_types.issubset(card_types)


def parse_flashcards_response(response_text: str):
    if "```json" in response_text:
        start = response_text.find("```json") + 7
        end = response_text.find("```", start)
        response_text = response_text[start:end].strip()
    elif "```" in response_text:
        start = response_text.find("```") + 3
        end = response_text.find("```", start)
        response_text = response_text[start:end].strip()

    start_idx = response_text.find("[")
    end_idx = response_text.rfind("]") + 1

    if start_idx == -1 or end_idx <= start_idx:
        return None

    response_text = response_text[start_idx:end_idx]
    return json.loads(response_text)


def request_flashcards_from_ollama(prompt: str, max_tokens: int):
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "llama3.1:8b",
            "prompt": prompt,
            "stream": False,
            "max_tokens": max_tokens
        }
    )

    return response


def generate_chunk_flashcards(request: ChunkRequest):
    global seen_chunk_questions

    difficulty_instructions = get_difficulty_instructions()
    exam_mode_instruction = get_exam_mode_instruction(request.exam_mode)
    cards_for_chunk = max(10, len(request.text.split()) // 100)
    question_mix_instruction = build_question_mix_instruction(request.exam_mode, cards_for_chunk)
    max_tokens = min(1500, max(500, len(request.text) // 2))
    chunk_start_time = time.time()

    if request.chunk_index == 0:
        seen_chunk_questions.clear()

    print(f"📦 Processing chunk {request.chunk_index + 1}/{request.total_chunks}")
    print(f"Chunk words: {len(request.text.split())}, Cards target: {cards_for_chunk}")
    print(f"🔢 Max tokens: {max_tokens}")

    prompt = f"""You are an expert flashcard generator.

DIFFICULTY: {request.difficulty.upper()}
{difficulty_instructions[request.difficulty]}

{exam_mode_instruction}
{question_mix_instruction}

STUDY MATERIAL (Part {request.chunk_index + 1} of {request.total_chunks}):
{request.text}

TASK: Generate at least {cards_for_chunk} flashcards from this section.

QUALITY RULES:
- Cover distinct ideas only. Do not repeat the same concept with slightly different wording.
- Questions must be specific, useful, and answerable from the study material.
- Every answer must be complete and non-empty.
- Multiple choice cards must include exactly 4 options.
- For MCQ, always return: question, options with 4 choices, and answer.
- For fill-in-the-blank, replace the missing key word or phrase with "____" in the question.
- Return a diverse set of question types according to the variety requirement above.

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

    response = request_flashcards_from_ollama(prompt, max_tokens)

    if response.status_code != 200:
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return {"error": "Ollama API error"}

    data = response.json()
    response_text = data.get("response", "").strip()
    flashcards = parse_flashcards_response(response_text)

    if flashcards is None:
        return {"error": "AI didn't return valid format. Try again."}

    if not isinstance(flashcards, list):
        return {"error": "Invalid AI response format."}

    seen_questions = set()
    unique_flashcards = []

    for card in flashcards:
        question = card.get("question", "").strip()
        if question and question not in seen_questions:
            seen_questions.add(question)
            unique_flashcards.append(card)

    flashcards = unique_flashcards

    deduplicated_flashcards = []
    for card in flashcards:
        question = card.get("question")
        answer = card.get("answer")

        if not question or not answer or answer.strip() == "":
            continue

        normalized_question = normalize_question(question)
        if normalized_question in seen_chunk_questions:
            continue

        seen_chunk_questions.add(normalized_question)
        deduplicated_flashcards.append(card)

    if len(deduplicated_flashcards) == 0:
        return {"error": "No flashcards generated. Add more text."}

    if request.exam_mode and not has_required_exam_mix(deduplicated_flashcards):
        return {"error": "Exam mode requires a mix of short answer, MCQ, true/false, and fill-in-the-blank flashcards."}

    elapsed_time = time.time() - chunk_start_time
    print(
        f"✅ Chunk {request.chunk_index + 1}/{request.total_chunks} generated "
        f"{len(deduplicated_flashcards)} flashcards in {elapsed_time:.2f}s"
    )
    return {
        "chunk_index": request.chunk_index,
        "total_chunks": request.total_chunks,
        "flashcards": deduplicated_flashcards
    }


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """Extract text from PDF, Word, or TXT files"""
    try:
        contents = await file.read()

        if file.filename.endswith(".pdf"):
            pdf_reader = PyPDF2.PdfReader(BytesIO(contents))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return {"text": text.strip()}

        elif file.filename.endswith(".docx") or file.filename.endswith(".doc"):
            doc = docx.Document(BytesIO(contents))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return {"text": text.strip()}

        elif file.filename.endswith(".txt"):
            text = contents.decode("utf-8")
            return {"text": text.strip()}

        else:
            return {"error": "Unsupported file format. Use PDF, Word, or TXT."}

    except Exception as e:
        return {"error": f"Failed to extract text: {str(e)}"}


@app.post("/generate-chunk")
async def generate_flashcards_chunk(request: ChunkRequest):
    print("✅ /generate-chunk endpoint received request")
    print(f"📝 Text length: {len(request.text)} characters")
    print(f"📦 Chunk index: {request.chunk_index + 1}/{request.total_chunks}")
    print(f"⚙️ Difficulty: {request.difficulty}, Exam mode: {request.exam_mode}")

    try:
        return generate_chunk_flashcards(request)

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


@app.post("/generate")
async def generate_flashcards(request: GenerateRequest):
    print("✅ /generate endpoint received request")
    print(f"📝 Text length: {len(request.text)} characters")
    print(f"⚙️ Difficulty: {request.difficulty}, Exam mode: {request.exam_mode}")

    try:
        difficulty_instructions = get_difficulty_instructions()
        exam_mode_instruction = get_exam_mode_instruction(request.exam_mode)
        question_mix_instruction = build_question_mix_instruction(request.exam_mode, 8)

        prompt = f"""You are an expert flashcard generator.

DIFFICULTY: {request.difficulty.upper()}
{difficulty_instructions[request.difficulty]}

{exam_mode_instruction}
{question_mix_instruction}

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

QUALITY RULES:
- For MCQ, always return: question, options with exactly 4 choices, and answer.
- For fill-in-the-blank, replace the missing key word or phrase with "____" in the question.
- If exam mode is enabled, do not return only short-answer cards.

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

        max_tokens = min(1500, max(500, len(request.text) // 2))
        response = request_flashcards_from_ollama(prompt, max_tokens)

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

        flashcards = parse_flashcards_response(response_text)

        if flashcards is None:
            print("❌ No JSON array found in response")
            return {"error": "AI didn't return valid format. Try again."}

        print(f"🧹 Cleaned JSON: {json.dumps(flashcards)[:200]}...")

        if not isinstance(flashcards, list):
            print("❌ Response is not a list")
            return {"error": "Invalid AI response format."}

        seen_questions = set()
        unique_flashcards = []

        for card in flashcards:
            question = card.get("question", "").strip()
            if question and question not in seen_questions:
                seen_questions.add(question)
                unique_flashcards.append(card)

        flashcards = unique_flashcards

        flashcards = [
            card for card in flashcards
            if card.get("question") and card.get("answer") and card.get("answer").strip() != ""
        ]

        if len(flashcards) == 0:
            print("❌ Empty flashcard list")
            return {"error": "No flashcards generated. Add more text."}

        if request.exam_mode and not has_required_exam_mix(flashcards):
            print("❌ Exam mode mix requirement not met")
            return {"error": "Exam mode requires a mix of short answer, MCQ, true/false, and fill-in-the-blank flashcards."}

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
