import pytest
from pipeline.bertopic_modeling import preprocess_documents

def test_preprocess_documents():
    docs = [
        {"id": "1", "title": "Test Title", "abstract": "Test abstract."},
        {"id": "2", "title": "Another Title", "abstract": "Another abstract."}
    ]

    result = preprocess_documents(docs)
    assert len(result) == 2
    assert result[0] == "Test Title. Test abstract."

def test_preprocess_documents_missing_abstract():
    docs = [
        {"id": "1", "title": "Test Title", "abstract": ""}
    ]

    result = preprocess_documents(docs)
    assert result[0] == "Test Title"

def test_preprocess_documents_missing_title():
    docs = [
        {"id": "1", "title": "", "abstract": "Test abstract."}
    ]

    result = preprocess_documents(docs)
    assert result[0] == "Test abstract."
