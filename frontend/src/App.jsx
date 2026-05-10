import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : ''),
})

const emptyForm = {
  title: '',
  description: '',
}

function getNotes(payload) {
  return Array.isArray(payload?.note) ? payload.note : []
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function App() {
  const [notes, setNotes] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fetchNotes = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const response = await api.get('/notes')
      setNotes(getNotes(response.data))
      setError('')
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Unable to load notes.'))
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let isActive = true

    api
      .get('/notes')
      .then((response) => {
        if (!isActive) {
          return
        }

        setNotes(getNotes(response.data))
        setError('')
      })
      .catch((fetchError) => {
        if (!isActive) {
          return
        }

        setError(getErrorMessage(fetchError, 'Unable to load notes.'))
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const filteredNotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return notes
    }

    return notes.filter((note) => {
      const searchableText = `${note.title || ''} ${note.description || ''}`.toLowerCase()
      return searchableText.includes(query)
    })
  }, [notes, searchTerm])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function resetComposer() {
    setForm(emptyForm)
    setEditingId(null)
    setActiveNoteId(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextNote = {
      title: form.title.trim(),
      description: form.description.trim(),
    }

    if (!nextNote.title || !nextNote.description) {
      setError('Please add both a title and a description.')
      setNotice('')
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      if (editingId) {
        await api.patch(`/notes/${editingId}`, nextNote)
        setNotice('Note updated.')
      } else {
        await api.post('/notes', nextNote)
        setNotice('Note created.')
      }

      resetComposer()
      await fetchNotes({ silent: true })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save this note.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteNote(note) {
    const noteTitle = note.title || 'this note'
    const confirmed = window.confirm(`Delete "${noteTitle}"?`)

    if (!confirmed) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/notes/${note._id}`)
      if (editingId === note._id) {
        resetComposer()
      }
      setNotice('Note deleted.')
      await fetchNotes({ silent: true })
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete this note.'))
    }
  }

  function handleEditNote(note) {
    setEditingId(note._id)
    setActiveNoteId(note._id)
    setForm({
      title: note.title || '',
      description: note.description || '',
    })
    setNotice('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app-shell">
      <section className="workspace-header" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Personal notes</p>
          <h1 id="app-title">Notes Workspace</h1>
          <p className="header-copy">
            Ideas, tasks, and follow-ups in one focused view.
          </p>
        </div>

        <div className="stats-strip" aria-label="Notes summary">
          <div className="stat-card">
            <span>{notes.length}</span>
            <small>Total notes</small>
          </div>
          <div className="stat-card accent">
            <span>{filteredNotes.length}</span>
            <small>Visible</small>
          </div>
        </div>
      </section>

      <section className="composer-grid" aria-label="Notes workspace">
        <form className="note-create-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <p className="eyebrow">{editingId ? 'Editing note' : 'New note'}</p>
            <h2>{editingId ? 'Refine the details' : 'Create a note'}</h2>
          </div>

          <label className="form-field">
            <span>Title</span>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Project idea"
              maxLength="80"
            />
          </label>

          <label className="form-field">
            <span>Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Write the important details here..."
              rows="6"
            />
          </label>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Update note' : 'Create note'}
            </button>
            {editingId && (
              <button className="ghost-button" type="button" onClick={resetComposer}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="notes-panel">
          <div className="notes-toolbar">
            <div>
              <p className="eyebrow">Library</p>
              <h2>Recent notes</h2>
            </div>

            <label className="search-field">
              <span className="sr-only">Search notes</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search notes"
              />
            </label>
          </div>

          <div className="status-region" aria-live="polite">
            {error && <p className="alert error">{error}</p>}
            {notice && !error && <p className="alert success">{notice}</p>}
          </div>

          {isLoading ? (
            <div className="empty-state">
              <span className="loader" aria-hidden="true" />
              <p>Loading notes...</p>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="notes">
              {filteredNotes.map((note, index) => (
                <article className={`note ${activeNoteId === note._id ? 'is-active' : ''}`} key={note._id}>
                  <div className="note-meta">
                    <span>Note {index + 1}</span>
                    {activeNoteId === note._id && <strong>Editing</strong>}
                  </div>
                  <h3>{note.title || 'Untitled note'}</h3>
                  <p>{note.description || 'No description added.'}</p>
                  <div className="note-actions">
                    <button className="secondary-button" type="button" onClick={() => handleEditNote(note)}>
                      Edit
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleDeleteNote(note)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{searchTerm ? 'No notes match your search.' : 'No notes yet. Create your first one.'}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
