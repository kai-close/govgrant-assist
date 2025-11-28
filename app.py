"""
GovGrant Assist - Main Streamlit Application
RAG-powered Government Grant Assistant

Implements PRD specifications for UI, authentication, and workflows
Version: 1.0.0 - Updated with LangChain v1.x compatibility
"""
import streamlit as st
from datetime import datetime
from config import Config
from rag_engine import RAGEngine
from llm_service import LLMService
from utils.validators import FileValidator, FormValidator


# Page Configuration
st.set_page_config(
    page_title="GovGrant Assist",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded"
)


def init_session_state():
    """Initialize session state variables"""
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False

    if 'rag_engine' not in st.session_state:
        st.session_state.rag_engine = None

    if 'llm_service' not in st.session_state:
        st.session_state.llm_service = None

    if 'messages' not in st.session_state:
        st.session_state.messages = []

    if 'document_loaded' not in st.session_state:
        st.session_state.document_loaded = False

    if 'document_info' not in st.session_state:
        st.session_state.document_info = None

    if 'generated_proposal' not in st.session_state:
        st.session_state.generated_proposal = None


def authenticate():
    """
    Authentication screen
    Per PRD Section 4: User enters App Password -> Session Unlocked
    """
    st.title("🏛️ GovGrant Assist")
    st.markdown("### Intelligent Grant Application Assistant")

    # REQUIRED EDUCATIONAL DISCLAIMER
    with st.expander("⚠️ IMPORTANT NOTICE - Please Read", expanded=True):
        st.warning("""
**IMPORTANT NOTICE:** This web application is a prototype developed for **educational purposes only**. The information provided here is **NOT intended for real-world usage** and should not be relied upon for making any decisions, especially those related to financial, legal, or healthcare matters.

**Furthermore, please be aware that the LLM may generate inaccurate or incorrect information. You assume full responsibility for how you use any generated output.**

Always consult with qualified professionals for accurate and personalized advice.
        """)

    st.info("**Welcome!** This application helps you understand government grant requirements and generate compliant proposals using AI.")

    with st.form("login_form"):
        password = st.text_input("Enter Access Password", type="password")
        submit = st.form_submit_button("Access Application", type="primary")

        if submit:
            if password == Config.APP_PASSWORD:
                st.session_state.authenticated = True
                st.rerun()
            else:
                st.error("❌ Invalid password. Please try again.")

    with st.expander("ℹ️ About This Application"):
        st.markdown("""
        **GovGrant Assist** is a RAG (Retrieval-Augmented Generation) powered tool that helps you:

        1. 📄 **Upload** official grant documentation
        2. 💬 **Chat** to understand requirements and eligibility
        3. ✍️ **Generate** compliant project proposals automatically

        **Privacy:** All data is stored temporarily in your browser session and cleared when you close the tab.

        **Project Type:** 2 - Capstone Assignment: Building an Interactive LLM-Powered Solution
        """)


def render_sidebar():
    """
    Sidebar for document upload and configuration
    Per PRD Section 3.3: Document Ingestion
    """
    with st.sidebar:
        st.header("📄 Document Upload")

        st.markdown("Upload the official grant guide (PDF format):")

        uploaded_file = st.file_uploader(
            "Grant Guide PDF",
            type=["pdf"],
            help=f"Maximum file size: {Config.MAX_FILE_SIZE_MB}MB. Text-based PDFs only.",
            label_visibility="collapsed"
        )

        if uploaded_file is not None:
            # Validate file
            is_valid, error_msg = FileValidator.validate_pdf(
                uploaded_file,
                Config.MAX_FILE_SIZE_BYTES
            )

            if not is_valid:
                st.error(f"❌ {error_msg}")
                return

            # Check if this is a new file
            file_hash = hash(uploaded_file.name + str(uploaded_file.size))
            current_hash = st.session_state.get('document_hash')

            if file_hash != current_hash:
                # New document - process it
                with st.spinner("🔄 Processing document... This may take a moment."):
                    try:
                        # Initialize RAG engine if needed
                        if st.session_state.rag_engine is None:
                            st.session_state.rag_engine = RAGEngine()

                        # Ingest document
                        stats = st.session_state.rag_engine.ingest_document(uploaded_file)

                        # Initialize LLM service
                        st.session_state.llm_service = LLMService(st.session_state.rag_engine)

                        # Update state
                        st.session_state.document_loaded = True
                        st.session_state.document_info = stats
                        st.session_state.document_hash = file_hash
                        st.session_state.messages = []  # Clear chat history

                        st.success("✅ Document processed successfully!")

                    except Exception as e:
                        st.error(f"❌ Error processing document: {str(e)}")
                        st.session_state.document_loaded = False

        # Display document info if loaded
        if st.session_state.document_loaded and st.session_state.document_info:
            st.divider()
            st.subheader("📊 Document Info")

            info = st.session_state.document_info
            st.metric("Pages", info['total_pages'])
            st.metric("Chunks", info['total_chunks'])
            st.caption(f"**File:** {info['filename']}")

        # Configuration section
        st.divider()
        st.subheader("⚙️ Configuration")

        provider = "OpenAI" if Config.LLM_PROVIDER == "openai" else "Google Gemini"
        model = Config.get_model_name()

        st.caption(f"**LLM Provider:** {provider}")
        st.caption(f"**Model:** {model}")

        # Logout button
        st.divider()
        if st.button("🚪 Logout", type="secondary", use_container_width=True):
            # Clear all session state
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.rerun()


def render_chat_interface():
    """
    Chat interface for Q&A
    Per PRD Section 3.1: Intelligent Requirement Analyzer
    """
    st.header("💬 Chat: Ask Questions About Requirements")

    if not st.session_state.document_loaded:
        st.warning("⚠️ Please upload a Grant Guide in the sidebar first.")
        return

    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("Ask about grant requirements, eligibility, deadlines, etc."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Get AI response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                response = st.session_state.llm_service.chat(
                    prompt,
                    st.session_state.messages[:-1]  # Previous history
                )
                st.markdown(response)

        # Add assistant message
        st.session_state.messages.append({"role": "assistant", "content": response})

    # Clear chat button
    if len(st.session_state.messages) > 0:
        if st.button("🗑️ Clear Chat History"):
            st.session_state.messages = []
            st.rerun()


def render_proposal_writer():
    """
    Proposal generation interface
    Per PRD Section 3.2: Automated Proposal Writer
    """
    st.header("✍️ Generate Proposal")

    if not st.session_state.document_loaded:
        st.warning("⚠️ Please upload a Grant Guide in the sidebar first.")
        return

    st.markdown("Fill in your project details below to generate a compliant proposal:")

    with st.form("proposal_form"):
        # Company Name
        company_name = st.text_input(
            "Company Name *",
            max_chars=100,
            help="Your organization's legal name"
        )

        # Project Title
        project_title = st.text_input(
            "Project Title *",
            max_chars=150,
            help="A clear, concise title for your project"
        )

        # Core Solution
        core_solution = st.text_area(
            "Core Solution / Project Description *",
            height=200,
            help="Describe your project in detail (minimum 50 characters, maximum 2000 words)",
            max_chars=20000
        )

        # Requested Budget (Optional)
        requested_budget = st.number_input(
            "Requested Budget (Optional)",
            min_value=0.0,
            step=1000.0,
            format="%.2f",
            help="Amount of funding you are requesting"
        )

        # Submit button
        submitted = st.form_submit_button(
            "🚀 Generate Proposal",
            type="primary",
            use_container_width=True
        )

        if submitted:
            # Validate inputs
            errors = []

            valid_company, msg = FormValidator.validate_company_name(company_name)
            if not valid_company:
                errors.append(msg)

            valid_title, msg = FormValidator.validate_project_title(project_title)
            if not valid_title:
                errors.append(msg)

            valid_solution, msg = FormValidator.validate_core_solution(core_solution)
            if not valid_solution:
                errors.append(msg)

            if requested_budget > 0:
                valid_budget, msg = FormValidator.validate_budget(requested_budget)
                if not valid_budget:
                    errors.append(msg)

            if errors:
                for error in errors:
                    st.error(f"❌ {error}")
            else:
                # Generate proposal
                with st.spinner("✨ Generating your proposal... This may take up to 30 seconds."):
                    try:
                        proposal = st.session_state.llm_service.generate_proposal(
                            company_name=company_name,
                            project_title=project_title,
                            core_solution=core_solution,
                            requested_budget=requested_budget if requested_budget > 0 else None
                        )

                        st.session_state.generated_proposal = {
                            'content': proposal,
                            'company': company_name,
                            'title': project_title,
                            'timestamp': datetime.now()
                        }

                        st.success("✅ Proposal generated successfully!")
                        st.rerun()

                    except Exception as e:
                        st.error(f"❌ Error generating proposal: {str(e)}")

    # Display generated proposal
    if st.session_state.generated_proposal:
        st.divider()
        st.subheader("📄 Generated Proposal")

        proposal_data = st.session_state.generated_proposal

        # Display proposal
        with st.container():
            st.markdown(proposal_data['content'])

        # Download button
        filename = f"Proposal_{proposal_data['company'].replace(' ', '_')}_{proposal_data['timestamp'].strftime('%Y%m%d')}.md"

        st.download_button(
            label="⬇️ Download Proposal (Markdown)",
            data=proposal_data['content'],
            file_name=filename,
            mime="text/markdown",
            type="primary",
            use_container_width=True
        )


def main():
    """Main application entry point"""
    # Initialize session
    init_session_state()

    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        st.error(f"⚠️ Configuration Error: {str(e)}")
        st.info("Please set up your API keys in the `.env` file.")
        st.stop()

    # Authentication check
    if not st.session_state.authenticated:
        authenticate()
        return

    # Main application
    render_sidebar()

    # Title
    st.title("🏛️ GovGrant Assist")
    st.caption("AI-Powered Grant Application Assistant")

    # Educational disclaimer on main page
    with st.expander("⚠️ IMPORTANT NOTICE"):
        st.warning("""
**IMPORTANT NOTICE:** This web application is a prototype developed for **educational purposes only**. The information provided here is **NOT intended for real-world usage** and should not be relied upon for making any decisions, especially those related to financial, legal, or healthcare matters.

**Furthermore, please be aware that the LLM may generate inaccurate or incorrect information. You assume full responsibility for how you use any generated output.**

Always consult with qualified professionals for accurate and personalized advice.
        """)

    # Navigation tabs
    tab1, tab2 = st.tabs(["💬 Chat & Explore", "✍️ Generate Proposal"])

    with tab1:
        render_chat_interface()

    with tab2:
        render_proposal_writer()

    # Footer
    st.divider()
    st.caption("⚠️ **Privacy Notice:** All uploaded documents and generated content are stored temporarily in your browser session and will be cleared when you close this tab.")


if __name__ == "__main__":
    main()
