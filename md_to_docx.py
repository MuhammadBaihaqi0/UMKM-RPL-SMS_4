import markdown
from htmldocx import HtmlToDocx
from docx import Document

# 1. Read the original markdown file
md_file_path = r'C:\Users\Isep\.gemini\antigravity\brain\94a3c081-3a66-4613-991a-ef82c204cb63\jawaban_assessment.md'
with open(md_file_path, 'r', encoding='utf-8') as f:
    md_text = f.read()

# 2. Convert Markdown to HTML
html_content = markdown.markdown(md_text, extensions=['tables', 'fenced_code'])

# 3. Initialize a new Word Document
document = Document()
new_parser = HtmlToDocx()

# 4. Add the HTML to the Document
new_parser.add_html_to_document(html_content, document)

# 5. Save the document
output_path = r'c:\xampp\htdocs\Umkm Insight\UMKM-RPL-SMS_4\Jawaban_Assessment_Lengkap.docx'
document.save(output_path)
print(f"Generated {output_path}")
