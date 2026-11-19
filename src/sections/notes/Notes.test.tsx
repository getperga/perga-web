import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoteDTO } from '@api/notes';
import { ProtectedRoute } from '@auth/ProtectedRoute';
import { Signin } from '@auth/Signin';
import { StorageKeys } from '@common/utils/storage_keys';
import { NotesProvider } from '@notes/context';

import Notes from './Notes';

const apiMocks = vi.hoisted(() => {
  return { getFolders: vi.fn(), getNote: vi.fn() };
});
const showError = vi.hoisted(() => {
  return vi.fn();
});
const auth = vi.hoisted(() => {
  return {
    isAuthenticated: true,
    signin: vi.fn(),
    googleSignin: vi.fn(),
    googleCallback: null as ((response: { code: string }) => Promise<void>) | null,
  };
});

vi.mock('@api/notes', () => {
  return {
    ...apiMocks,
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    emptyTrash: vi.fn(),
    exportNotes: vi.fn(),
    importNotes: vi.fn(),
    reorderPinnedNotes: vi.fn(),
  };
});
vi.mock('@common/contexts/toast/useToast', () => {
  return {
    useToast: () => {
      return { showError };
    },
  };
});
vi.mock('@common/contexts/auth/useAuth', () => {
  return {
    useAuth: () => {
      return { ...auth, isLoading: false };
    },
  };
});
vi.mock('@/config', () => {
  return {
    getConfig: () => {
      return { IS_SIGNUP_DISABLED: true, GOOGLE_CLIENT_ID: 'test-client' };
    },
  };
});
vi.mock('@common/utils/googleAuth', () => {
  return {
    useGoogleAuthInit: (callback: typeof auth.googleCallback) => {
      auth.googleCallback = callback;
    },
    requestGoogleCode: () => {
      void auth.googleCallback?.({ code: 'test-code' });
    },
  };
});
vi.mock('@common/components/Icon/Icon', () => {
  return {
    Icon: () => {
      return null;
    },
  };
});
vi.mock('@common/components/TwoPaneLayout', () => {
  return {
    TwoPaneLayout: ({ rightPane }: { rightPane: ReactNode }) => {
      return <>{rightPane}</>;
    },
  };
});
vi.mock('@notes/components/NotesFolders/NotesFolders', () => {
  return {
    NotesFolders: () => {
      return null;
    },
  };
});
vi.mock('@notes/components/PinnedNotesPanel', () => {
  return {
    PinnedNotesPanel: () => {
      return null;
    },
  };
});
vi.mock('@notes/components/NotesEditor/NotesEditor', () => {
  return {
    NotesEditor: ({ note }: { note: NoteDTO | null }) => {
      return <div data-testid="editor">{note?.body}</div>;
    },
  };
});

const notes: NoteDTO[] = [1, 42, 43].map((id) => {
  return {
    id,
    folder_id: 1,
    title: `Note ${id}`,
    body: `Body ${id}`,
    updated_dt: '2026-11-18T00:00:00Z',
    is_pinned: false,
  };
});

const createRouter = (path: string) => {
  return createMemoryRouter(
    [
      { path: '/signin/', element: <Signin /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: (
              <NotesProvider>
                <Outlet />
              </NotesProvider>
            ),
            children: [
              { path: '/planner/', element: <div>Planner</div> },
              { path: '/notes/:noteId?', element: <Notes /> },
            ],
          },
        ],
      },
    ],
    { initialEntries: ['/planner/', path] },
  );
};

describe('opening a note from its URL', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(StorageKeys.NotesSelectedNoteId, '1');
    localStorage.setItem(StorageKeys.NotesHistory, '[1]');
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.signin.mockImplementation(async () => {
      auth.isAuthenticated = true;
    });
    auth.googleSignin.mockImplementation(async () => {
      auth.isAuthenticated = true;
    });
    apiMocks.getNote.mockReset().mockImplementation(async (id: number) => {
      return {
        data: notes.find((note) => {
          return note.id === id;
        }),
      };
    });
    apiMocks.getFolders.mockResolvedValue({
      data: {
        root_folder: {
          id: 1,
          parent_id: null,
          folder_type: 'root',
          name: 'Notes',
          notes,
          subfolders: [],
        },
        trash_folder: {
          id: 2,
          parent_id: null,
          folder_type: 'trash',
          name: 'Trash',
          notes: [],
          subfolders: [],
        },
      },
    });
  });

  it.each(['/notes/42/', '/notes/42'])(
    'opens %s, persists the selection and replaces the link in browser history',
    async (path) => {
      const router = createRouter(path);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByTestId('editor').textContent).toBe('Body 42');
      });
      expect(router.state.location.pathname).toBe('/notes/');
      expect(localStorage.getItem(StorageKeys.NotesSelectedNoteId)).toBe('42');
      expect(JSON.parse(localStorage.getItem(StorageKeys.NotesHistory) ?? '[]')).toEqual([1, 42]);

      await act(async () => {
        await router.navigate(-1);
      });
      expect(router.state.location.pathname).toBe('/planner/');
      await act(async () => {
        await router.navigate(1);
      });
      expect(router.state.location.pathname).toBe('/notes/');
      expect(showError).not.toHaveBeenCalled();
    },
  );

  it.each(['abc', '0', '-1', '1.5', '1e2', '9007199254740992'])(
    'rejects invalid ID %s without changing the selected note or history',
    async (id) => {
      const router = createRouter(`/notes/${id}/`);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/notes/');
      });
      expect(localStorage.getItem(StorageKeys.NotesSelectedNoteId)).toBe('1');
      expect(localStorage.getItem(StorageKeys.NotesHistory)).toBe('[1]');
      expect(showError).toHaveBeenCalledWith('Invalid note link');
      expect(
        apiMocks.getNote.mock.calls.every(([noteId]) => {
          return noteId === 1;
        }),
      ).toBe(true);
    },
  );

  it.each([403, 404, 500])('handles an unavailable note (HTTP %s)', async (status) => {
    apiMocks.getNote.mockImplementation(async (id: number) => {
      if (id === 42) {
        throw { response: { status } };
      }
      return { data: notes[0] };
    });
    const router = createRouter('/notes/42/');
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/notes/');
    });
    expect(localStorage.getItem(StorageKeys.NotesSelectedNoteId)).toBe('1');
    expect(localStorage.getItem(StorageKeys.NotesHistory)).toBe('[1]');
    expect(showError).toHaveBeenCalledWith(
      'Could not open this note. Please check access and try again.',
    );
  });

  it('does not store a note ID before the API confirms access', async () => {
    let resolveNote!: (value: { data: NoteDTO }) => void;
    apiMocks.getNote.mockImplementation((id: number) => {
      if (id !== 42) {
        return Promise.resolve({ data: notes[0] });
      }
      return new Promise<{ data: NoteDTO }>((resolve) => {
        resolveNote = resolve;
      });
    });
    const router = createRouter('/notes/42/');
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(resolveNote).toBeDefined();
    });
    expect(screen.getByRole('status').textContent).toBe('Opening note…');
    expect(localStorage.getItem(StorageKeys.NotesSelectedNoteId)).toBe('1');
    await act(async () => {
      await router.navigate('/planner/');
    });
    await act(async () => {
      resolveNote({ data: notes[1] });
    });

    expect(router.state.location.pathname).toBe('/planner/');
    expect(
      apiMocks.getNote.mock.calls.find(([id]) => {
        return id === 42;
      })?.[1].aborted,
    ).toBe(true);
    expect(localStorage.getItem(StorageKeys.NotesSelectedNoteId)).toBe('1');
    expect(localStorage.getItem(StorageKeys.NotesHistory)).toBe('[1]');
  });

  it('opens another linked note when the Notes workspace is already mounted', async () => {
    const router = createRouter('/notes/42/');
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor').textContent).toBe('Body 42');
    });

    await act(async () => {
      await router.navigate('/notes/43/');
    });
    await waitFor(() => {
      expect(screen.getByTestId('editor').textContent).toBe('Body 43');
    });
    expect(router.state.location.pathname).toBe('/notes/');
    expect(localStorage.getItem(StorageKeys.NotesSelectedNoteId)).toBe('43');
  });

  it('shows fresh content when reopening the link to the selected note', async () => {
    const router = createRouter('/notes/42/');
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor').textContent).toBe('Body 42');
    });
    apiMocks.getNote.mockImplementation(async (id: number) => {
      return {
        data: {
          ...notes.find((note) => {
            return note.id === id;
          }),
          body: 'Updated on the server',
        },
      };
    });

    await act(async () => {
      await router.navigate('/notes/42/');
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/notes/');
      expect(screen.getByTestId('editor').textContent).toBe('Updated on the server');
    });
    expect(localStorage.getItem(StorageKeys.NotesSelectedNoteId)).toBe('42');
    expect(JSON.parse(localStorage.getItem(StorageKeys.NotesHistory) ?? '[]')).toEqual([1, 42]);
  });

  it.each(['password', 'Google'])('preserves the link through %s sign-in', async (method) => {
    auth.isAuthenticated = false;
    const router = createRouter('/notes/42/');
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Sign in to your account' });

    if (method === 'Google') {
      fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    } else {
      fireEvent.change(screen.getByLabelText('Username'), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
      fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    }

    await waitFor(() => {
      expect(screen.getByTestId('editor').textContent).toBe('Body 42');
    });
    expect(router.state.location.pathname).toBe('/notes/');
    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/planner/');
  });
});
