function MergePrompt({ merging, onMerge, onDiscard }) {
  return (
    <div className="modal-backdrop">
      <div
        className="modal modal-narrow"
        role="dialog"
        aria-label="Merge guest lists"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>Add your guest items?</h2>
        </header>
        <p className="modal-hint">
          You have items saved on this device from before you signed in. Would you like to
          add them to your account's <strong>"My list"</strong>? Duplicates (by title) will be
          skipped.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onDiscard}
            disabled={merging}
          >
            Discard local items
          </button>
          <button
            type="button"
            className="btn-add"
            onClick={onMerge}
            disabled={merging}
          >
            {merging ? 'Merging…' : 'Add to my account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MergePrompt
