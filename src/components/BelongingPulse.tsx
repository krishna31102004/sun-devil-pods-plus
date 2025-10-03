import React, { useState } from 'react';

/**
 * BelongingPulse is a modal component that prompts the user to
 * reflect on their sense of belonging and connection. It
 * presents three Likert-scale questions and saves the results
 * to localStorage when submitted. The parent can react to
 * new scores via the onSave callback. We intentionally keep
 * this component self-contained so it can be reused or
 * extended in the future.
 */
interface BelongingPulseProps {
  /** Called with the array of scores (1–5) when the user saves */
  onSave: (scores: number[]) => void;
  /** Called when the modal should be closed without saving */
  onClose: () => void;
}

// Questions matching the pilot evaluation criteria. These
// correspond to the three items defined in the build spec.
const PULSE_QUESTIONS = [
  'I feel like I belong at ASU.',
  'I have at least two peers I can reach out to for help.',
  'I feel comfortable approaching others in my pod.',
];

const BelongingPulse: React.FC<BelongingPulseProps> = ({ onSave, onClose }) => {
  // Use local state to track the current selection for each
  // question. Initialize with 3 (neutral) for a gentle default.
  const [scores, setScores] = useState<number[]>([3, 3, 3]);

  // Handle radio input change. Each radio corresponds to a
  // question index (0–2) and value (1–5).
  const handleChange = (idx: number, value: number) => {
    setScores(prev => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  // Save the scores to localStorage and notify parent. We
  // append a timestamped entry to the belongingPulse array and
  // propagate the scores up for immediate UI updates.
  const handleSave = () => {
    try {
      const history: { date: string; scores: number[] }[] = JSON.parse(
        localStorage.getItem('belongingPulse') || '[]'
      );
      history.push({ date: new Date().toISOString(), scores });
      localStorage.setItem('belongingPulse', JSON.stringify(history));
    } catch (e) {
      // If parsing fails, start a new history.
      const history = [{ date: new Date().toISOString(), scores }];
      localStorage.setItem('belongingPulse', JSON.stringify(history));
    }
    onSave(scores);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white/90 rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4 text-indigo-700">Belonging Pulse</h2>
        <p className="text-sm mb-4 text-gray-700">
          Reflect on your experience so far. Choose a number from 1 (strongly disagree) to 5 (strongly agree) for each statement.
        </p>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {PULSE_QUESTIONS.map((q, idx) => (
            <div key={idx} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {q}
              </label>
              <div className="flex space-x-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <label key={n} className="flex flex-col items-center text-xs">
                    <input
                      type="radio"
                      name={`question-${idx}`}
                      value={n}
                      checked={scores[idx] === n}
                      onChange={() => handleChange(idx, n)}
                      className="mb-1"
                    />
                    {n}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-md hover:bg-indigo-700 shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default BelongingPulse;