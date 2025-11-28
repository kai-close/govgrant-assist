# ⚡ Quick Start Guide - GovGrant Assist

Get up and running in 5 minutes!

---

## 🚀 Setup (First Time Only)

### Step 1: Clone and Navigate

```bash
cd /Users/zhiting/ai-champions-bootcamp/govgrant-assist
```

### Step 2: Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Mac/Linux
# On Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your API key
nano .env  # or use your preferred editor
```

**Minimum required in `.env`:**

```env
# For OpenAI (recommended for beginners)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4o-mini

# Application password
APP_PASSWORD=demo123
```

**Get API Key:**
- OpenAI: https://platform.openai.com/api-keys
- Google: https://makersuite.google.com/app/apikey

---

## ▶️ Run the Application

```bash
streamlit run app.py
```

The app will automatically open in your browser at `http://localhost:8501`

---

## 📖 Using the Application

### 1️⃣ Login

- Enter password: `demo123` (or whatever you set in `.env`)
- Click "Access Application"

### 2️⃣ Upload a Grant Guide

- In the **sidebar**, click "Browse files"
- Upload a PDF (must be text-based, not scanned image)
- Wait for "✅ Document processed successfully!"

**Test PDFs:**
- Use any government grant guide PDF
- Or create a simple test PDF with grant criteria

### 3️⃣ Option A: Chat

- Go to **"💬 Chat & Explore"** tab
- Ask questions like:
  - "What are the eligibility requirements?"
  - "How much funding can I apply for?"
  - "What is the application deadline?"
- Get answers with page citations

### 4️⃣ Option B: Generate Proposal

- Go to **"✍️ Generate Proposal"** tab
- Fill in the form:
  - **Company Name:** Your organization
  - **Project Title:** Your project name
  - **Core Solution:** Describe your project (50+ characters)
  - **Budget:** (Optional) Amount you're requesting
- Click **"🚀 Generate Proposal"**
- Wait 15-30 seconds
- Download the generated proposal

---

## 🎯 Quick Test Workflow

### Complete Test (3 minutes)

1. **Start app:** `streamlit run app.py`

2. **Login** with `demo123`

3. **Upload test PDF:**
   - Use any PDF with text (grant guide, policy doc, etc.)

4. **Test Chat:**
   ```
   You: What is this document about?
   AI: [Response with page citations]
   ```

5. **Test Proposal:**
   - Company: "Test Corp"
   - Title: "AI Innovation Project"
   - Solution: "We propose to develop an AI-powered system that helps small businesses automate their grant application process using natural language processing."
   - Budget: 50000
   - Click Generate

6. **Download** the proposal

7. **Test Privacy:**
   - Refresh page (F5)
   - Verify it returns to login screen
   - Verify document is cleared

---

## 🐛 Troubleshooting

### "Module not found" errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

### "API key not found"

```bash
# Check .env file exists
ls -la .env

# Verify content
cat .env

# Make sure OPENAI_API_KEY is set correctly
```

### "OCR not supported" error

**Problem:** You uploaded a scanned PDF (image-only)

**Solution:** Use a text-based PDF or convert using online tools

### Application won't start

```bash
# Check if port 8501 is in use
lsof -i :8501

# Kill existing process if needed
kill -9 [PID]

# Try different port
streamlit run app.py --server.port 8502
```

### Slow responses

**Possible causes:**
1. Large PDF (100+ pages) → Use smaller documents
2. Slow internet → Check connection
3. API rate limits → Wait and retry

---

## 💡 Tips for Best Results

### Document Upload
- ✅ Use official grant guides (PDFs from .gov sites)
- ✅ Text-based PDFs work best
- ✅ Keep under 50 pages for fast processing
- ❌ Avoid scanned images
- ❌ Don't upload corrupted files

### Chat Questions
- ✅ Be specific: "What are the eligibility criteria for SMEs?"
- ✅ Reference document sections: "What does Section 3 say about budget?"
- ❌ Avoid: "Tell me everything" (too broad)

### Proposal Generation
- ✅ Write detailed solution (100-500 words)
- ✅ Be specific about your technology/approach
- ✅ Mention business value and impact
- ❌ Don't write just 1-2 sentences
- ❌ Don't leave solution empty

---

## 🔧 Configuration Options

Edit `.env` to customize:

```env
# Maximum PDF file size (in MB)
MAX_FILE_SIZE_MB=10

# RAG chunking parameters
CHUNK_SIZE=1000          # Larger = more context, slower
CHUNK_OVERLAP=100        # Overlap between chunks

# Number of chunks to retrieve
TOP_K_RESULTS=3          # Higher = more context, more tokens

# Model selection
OPENAI_MODEL=gpt-4o-mini    # Fast and cheap
# OPENAI_MODEL=gpt-4        # Slower but higher quality
```

---

## 🎓 Learning Path

### Beginner (Day 1)
1. ✅ Install and run
2. ✅ Upload a test PDF
3. ✅ Ask 3-5 chat questions
4. ✅ Generate one proposal

### Intermediate (Day 2-3)
1. ✅ Try different PDFs
2. ✅ Experiment with prompts
3. ✅ Compare OpenAI vs Google Gemini
4. ✅ Read [ARCHITECTURE.md](ARCHITECTURE.md)

### Advanced (Week 1)
1. ✅ Review the code
2. ✅ Customize prompts in `llm_service.py`
3. ✅ Add features (export to Word, etc.)
4. ✅ Deploy to Streamlit Cloud

---

## 📚 Next Steps

- **Read:** [README.md](README.md) for full documentation
- **Deploy:** [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- **Test:** [TESTING.md](TESTING.md) for quality assurance
- **Learn:** [ARCHITECTURE.md](ARCHITECTURE.md) for system design

---

## 🆘 Getting Help

### Common Questions

**Q: Can I use this for non-grant documents?**
A: Yes! Works with any PDF (contracts, policies, RFPs)

**Q: Is my data safe?**
A: Yes, everything is stored in your browser session only and cleared on refresh

**Q: Can I use this offline?**
A: No, it requires internet for LLM API calls

**Q: How much does it cost?**
A: Depends on usage. Typical session:
- Chat: ~$0.01-0.05
- Proposal: ~$0.05-0.15
(Based on OpenAI pricing)

**Q: Can multiple people use it?**
A: Yes, each user gets their own session

---

## ✅ Success Checklist

After following this guide, you should be able to:

- [ ] Start the application
- [ ] Login successfully
- [ ] Upload a PDF document
- [ ] Ask questions in chat
- [ ] Receive answers with citations
- [ ] Generate a proposal
- [ ] Download the proposal
- [ ] Understand privacy features

---

**Need more help?** Check the [README.md](README.md) or open an issue on GitHub.

**Ready to deploy?** See [DEPLOYMENT.md](DEPLOYMENT.md)

---

*Last Updated: 2025-11-28*
