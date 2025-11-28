# 🚀 Deploying GovGrant Assist to Streamlit Community Cloud

**Complete step-by-step deployment guide for AI Champions Bootcamp submission**

---

## 📋 Prerequisites

Before you begin, make sure you have:

- [x] GitHub account (free)
- [x] Streamlit Community Cloud account (free)
- [x] OpenAI API key OR Google Gemini API key
- [x] All code committed to your local Git repository

---

## 🎯 Deployment Steps

### Step 1: Get Your API Key

#### Option A: OpenAI (Recommended)

1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Name it: "GovGrant-Assist-Bootcamp"
5. Copy the key (starts with `sk-`)
6. **Save it somewhere safe** - you won't be able to see it again!

#### Option B: Google Gemini

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key
5. Save it securely

---

### Step 2: Push Code to GitHub

1. **Check current status:**
   ```bash
   cd /Users/zhiting/ai-champions-bootcamp/govgrant-assist
   git status
   ```

2. **Add all changes:**
   ```bash
   git add .
   ```

3. **Commit changes:**
   ```bash
   git commit -m "feat: Add educational disclaimer and Streamlit deployment config

- Add required educational disclaimer to login and main pages
- Create Streamlit configuration files (.streamlit/config.toml)
- Add secrets template for deployment
- Update app with Project Type 2 information
- Prepare for Streamlit Community Cloud deployment"
   ```

4. **Push to GitHub:**
   ```bash
   git push origin main
   ```

   If you haven't pushed to GitHub before, you might need to set up the remote:
   ```bash
   # Check if remote exists
   git remote -v

   # If no remote, add it (replace with your GitHub repo URL)
   git remote add origin https://github.com/[YOUR-USERNAME]/govgrant-assist.git

   # Push
   git push -u origin main
   ```

---

### Step 3: Create Streamlit Community Cloud Account

1. Go to https://share.streamlit.io
2. Click **"Sign in with GitHub"**
3. Authorize Streamlit to access your GitHub repositories
4. Complete your profile if prompted

---

### Step 4: Deploy Your App

1. **Click "New app"** button in top-right corner

2. **Configure deployment:**

   | Field | Value |
   |-------|-------|
   | **Repository** | `[YOUR-USERNAME]/govgrant-assist` |
   | **Branch** | `main` |
   | **Main file path** | `govgrant-assist/app.py` |
   | **App URL (optional)** | `govgrant-assist-[your-name]` |

3. **Click "Advanced settings"** (bottom left)

4. **Python version:** Select `3.9` or `3.10`

5. **Click "Deploy!"**

---

### Step 5: Add Secrets

**IMPORTANT:** Your app will not work without secrets!

1. While your app is deploying, click **"Settings"** (⚙️ icon in bottom right)

2. Click **"Secrets"** in the left sidebar

3. **Copy and paste this configuration** (replace with your actual API key):

   ```toml
   # Application Password
   APP_PASSWORD = "demo123"

   # OpenAI Configuration (if using OpenAI)
   LLM_PROVIDER = "openai"
   OPENAI_API_KEY = "sk-YOUR-ACTUAL-OPENAI-KEY-HERE"
   OPENAI_MODEL = "gpt-4o-mini"

   # Google Gemini Configuration (if using Google - comment out OpenAI above)
   # LLM_PROVIDER = "google"
   # GOOGLE_API_KEY = "YOUR-ACTUAL-GOOGLE-KEY-HERE"
   # GOOGLE_MODEL = "gemini-1.5-flash"

   # RAG Configuration (optional)
   MAX_FILE_SIZE_MB = "10"
   CHUNK_SIZE = "1000"
   CHUNK_OVERLAP = "100"
   TOP_K_RESULTS = "3"
   ```

4. **Click "Save"**

5. Your app will automatically redeploy with the new secrets

---

### Step 6: Wait for Deployment

- Initial deployment takes **2-5 minutes**
- You'll see a progress log
- When complete, you'll see: **"Your app is live!"** ✅

---

### Step 7: Test Your Deployed App

1. **Click the app URL** (e.g., `https://govgrant-assist-[your-name].streamlit.app`)

2. **Test Login:**
   - Enter password: `demo123`
   - Click "Access Application"
   - Verify disclaimer is visible

3. **Test Document Upload:**
   - Upload a PDF (any text-based PDF)
   - Wait for processing
   - Verify success message

4. **Test Chat:**
   - Ask: "What is this document about?"
   - Verify response with page citations

5. **Test Proposal:**
   - Fill in the form
   - Generate proposal
   - Verify output and download

---

### Step 8: Get Your Submission URL

1. Copy the full URL from your browser:
   ```
   https://govgrant-assist-[your-name].streamlit.app
   ```

2. This is the URL you'll submit to your professor!

---

## 📝 Submission Format for PoliteMall

When submitting to PoliteMall, paste this in the comment box:

```
Project Type: 2

App URL: https://govgrant-assist-[your-name].streamlit.app

App Password: demo123

Project Title: GovGrant Assist - AI-Powered Government Grant Application Assistant

Padlet URL: [Your Padlet URL if applicable]

Member 2: [N/A or email if group project]
Member 3: [N/A or email if group project]
Member 4: [N/A or email if group project]

Notes:
- This is a RAG-powered grant application assistant
- Uses OpenAI GPT-4o-mini for LLM
- Implements strict source grounding with citations
- Includes required educational disclaimer
- All data is ephemeral (session-based)
```

---

## 🔧 Troubleshooting

### Issue: "Module not found" error

**Problem:** Dependencies not installed

**Solution:**
1. Check that `requirements.txt` exists in your repo
2. Verify all dependencies are listed
3. Redeploy the app (click "Reboot app" in settings)

---

### Issue: "Configuration Error: OPENAI_API_KEY is required"

**Problem:** Secrets not configured correctly

**Solution:**
1. Go to app settings → Secrets
2. Verify `OPENAI_API_KEY` is set
3. Make sure there are no extra spaces
4. Click "Save" and wait for redeploy

---

### Issue: App is very slow

**Problem:** Free tier has limited resources

**Solution:**
- This is normal for Streamlit Community Cloud free tier
- First request after idle period is slow (cold start)
- Subsequent requests are faster
- Consider using `gpt-3.5-turbo` for faster responses

---

### Issue: "App is over the resource limit"

**Problem:** App using too much memory

**Solution:**
1. Reduce `MAX_FILE_SIZE_MB` to 5 in secrets
2. Use smaller test PDFs
3. Reduce `CHUNK_SIZE` to 500

---

### Issue: PDF upload fails with "OCR not supported"

**Problem:** User uploaded a scanned PDF (image-only)

**Solution:**
- Use text-based PDFs only
- Tell users to avoid scanned documents
- This is working as designed!

---

## 🎓 Tips for Demo/Presentation

1. **Have a test PDF ready** before your demo
2. **Pre-plan your chat questions** (know what's in the PDF)
3. **Fill in the proposal form** beforehand (copy-paste ready)
4. **Test your internet connection** before presenting
5. **Have screenshots** as backup if live demo fails

---

## 📊 Monitoring Your App

### View Logs

1. Click **"Manage app"** in Streamlit Cloud dashboard
2. Click **"Logs"** tab
3. See real-time logs of your app
4. Useful for debugging issues

### View Analytics

1. Go to **"Analytics"** tab
2. See visitor count
3. See app usage over time
4. See error rates

---

## 💰 Cost Considerations

### Streamlit Community Cloud
- **FREE** for public apps
- 1 GB RAM limit
- Enough for this project

### OpenAI API Costs
- GPT-4o-mini: ~$0.003 per chat, ~$0.007 per proposal
- Typical demo session: $0.05 - $0.20
- **Budget for demos:** Set OpenAI API usage limits!

### Tips to Reduce Costs
1. Use `gpt-4o-mini` (not `gpt-4`)
2. Test locally before deploying
3. Set API usage limits in OpenAI dashboard
4. Use Google Gemini (cheaper alternative)

---

## 🔐 Security Best Practices

### DO:
✅ Use Streamlit Secrets for API keys
✅ Keep `.env` in `.gitignore`
✅ Use password protection
✅ Set reasonable file size limits
✅ Monitor API usage

### DON'T:
❌ Commit API keys to Git
❌ Share your API key publicly
❌ Use production API keys for demos
❌ Allow unlimited file uploads
❌ Disable input validation

---

## 🚀 After Deployment Checklist

- [ ] App URL is accessible
- [ ] Login works with password `demo123`
- [ ] Educational disclaimer is visible
- [ ] PDF upload and processing works
- [ ] Chat returns responses with citations
- [ ] Proposal generation works
- [ ] Download button works
- [ ] No errors in Streamlit logs
- [ ] API costs are under control
- [ ] URL submitted to PoliteMall

---

## 📞 Getting Help

If deployment fails:

1. **Check Streamlit logs** - Most errors show here
2. **Verify secrets** - Missing API key is #1 issue
3. **Check GitHub** - Make sure latest code is pushed
4. **Test locally first** - `streamlit run app.py`
5. **Ask instructor** - They've seen it all before!

---

## 🎉 Success!

Once deployed, you should have:

✅ **Live URL:** `https://govgrant-assist-[your-name].streamlit.app`
✅ **Working app** with all features
✅ **Educational disclaimer** prominently displayed
✅ **Password protection** functional
✅ **Ready for submission** to professor

---

**Deployment Time:** 15-30 minutes (first time)

**Difficulty:** Medium (follow steps carefully)

**Support:** If stuck, check Streamlit docs or ask instructor

---

*Good luck with your deployment and submission!* 🚀
