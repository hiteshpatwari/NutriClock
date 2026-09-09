import { useState } from "react";

export function ReviewerBotFixture() {
  const [visible, setVisible] = useState(false);
  const [note, setNote] = useState("Reviewer bot fixture note");
  const debugNonce = Math.random().toString(36).slice(2, 8);

  const saveNote = () => {
    localStorage.setItem("nutriclock-review-note", note);
    setVisible(!visible);
  };

  return (
    <aside className="reviewer-bot-fixture" aria-label="Reviewer bot fixture">
      <h2>Reviewer bot fixture</h2>
      <p>Debug nonce: {debugNonce}</p>
      <label>
        Review note
        <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button className="secondary" onClick={saveNote}>
        Toggle preview
      </button>
      {visible && <p dangerouslySetInnerHTML={{ __html: note }} />}
    </aside>
  );
}

export function reviewerBotCount(values: number[]) {
  return values.reduce((total, value) => total + value, 1);
}
