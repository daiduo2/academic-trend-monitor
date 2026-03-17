from pipeline.daily_fetch import fetch_arxiv_papers_by_ids


def test_fetch_arxiv_papers_by_ids_smoke(monkeypatch):
    calls = []

    class FakeResponse:
        status_code = 200
        content = b"""<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns='http://www.w3.org/2005/Atom' xmlns:arxiv='http://arxiv.org/schemas/atom'>
  <entry>
    <id>http://arxiv.org/abs/2603.11048v1</id>
    <title>Example Title</title>
    <summary>Example abstract</summary>
    <published>2026-03-11T17:59:59Z</published>
    <updated>2026-03-12T00:00:00Z</updated>
    <author><name>Alice</name></author>
    <arxiv:primary_category term='cs.CV' />
    <category term='cs.CV' />
    <link title='pdf' href='https://arxiv.org/pdf/2603.11048v1.pdf' />
  </entry>
</feed>"""

        def raise_for_status(self):
            return None

    def fake_get(url, params, timeout):
        calls.append((url, params, timeout))
        return FakeResponse()

    monkeypatch.setattr("requests.get", fake_get)
    monkeypatch.setattr("time.sleep", lambda *_: None)

    papers = fetch_arxiv_papers_by_ids(["2603.11048v1"], chunk_size=1)

    assert len(papers) == 1
    assert papers[0]["id"] == "2603.11048v1"
    assert papers[0]["primary_category"] == "cs.CV"
    assert calls[0][1]["id_list"] == "2603.11048v1"


def test_fetch_arxiv_papers_by_ids_preserves_requested_id(monkeypatch):
    class FakeResponse:
        status_code = 200
        content = b"""<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns='http://www.w3.org/2005/Atom' xmlns:arxiv='http://arxiv.org/schemas/atom'>
  <entry>
    <id>http://arxiv.org/abs/2505.00108v1</id>
    <title>Example Title</title>
    <summary>Example abstract</summary>
    <published>2025-04-30T18:22:44Z</published>
    <updated>2025-04-30T18:22:44Z</updated>
    <author><name>Alice</name></author>
    <arxiv:primary_category term='math.FA' />
    <category term='math.FA' />
    <link title='pdf' href='https://arxiv.org/pdf/2505.00108v1.pdf' />
  </entry>
</feed>"""

        def raise_for_status(self):
            return None

    monkeypatch.setattr("requests.get", lambda *args, **kwargs: FakeResponse())
    monkeypatch.setattr("time.sleep", lambda *_: None)

    papers = fetch_arxiv_papers_by_ids(["2505.00108"], chunk_size=1)

    assert len(papers) == 1
    assert papers[0]["id"] == "2505.00108"
    assert papers[0]["pdf_url"] == "https://arxiv.org/pdf/2505.00108v1.pdf"
