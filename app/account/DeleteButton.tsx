'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/account', { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to delete account. Try again.');
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="acctDeleteConfirm">
        <p>This will permanently delete your account and all scores. This cannot be undone.</p>
        {error && <p className="acctDeleteError">{error}</p>}
        <div className="acctDeleteActions">
          <button className="acctBtnDanger" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting…' : 'Yes, delete my account'}
          </button>
          <button className="acctBtnSecondary" onClick={() => setConfirming(false)} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className="acctBtnDanger" onClick={() => setConfirming(true)}>
      Delete account
    </button>
  );
}
