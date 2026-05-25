'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineStar,
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi';
import Card, { CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatRelativeTime } from '@/lib/utils';

type Tab = 'notes' | 'todos' | 'activity';

interface Note {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  updatedAt: string;
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  action: string;
  createdAt: string;
}

const noteColors = [
  { name: 'default', class: 'bg-dark-800 border-dark-700' },
  { name: 'blue', class: 'bg-blue-500/10 border-blue-500/30' },
  { name: 'purple', class: 'bg-purple-500/10 border-purple-500/30' },
  { name: 'green', class: 'bg-emerald-500/10 border-emerald-500/30' },
  { name: 'yellow', class: 'bg-yellow-500/10 border-yellow-500/30' },
  { name: 'pink', class: 'bg-pink-500/10 border-pink-500/30' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'text-dark-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-red-400' },
];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // Form states
  const [noteForm, setNoteForm] = useState({ title: '', content: '', color: 'default' });
  const [todoForm, setTodoForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notesRes, todosRes, activitiesRes] = await Promise.all([
        fetch('/api/hub/notes'),
        fetch('/api/hub/todos'),
        fetch('/api/hub/activities'),
      ]);

      const [notesData, todosData, activitiesData] = await Promise.all([
        notesRes.json(),
        todosRes.json(),
        activitiesRes.json(),
      ]);

      if (notesData.notes) setNotes(notesData.notes);
      if (todosData.todos) setTodos(todosData.todos);
      if (activitiesData.activities) setActivities(activitiesData.activities);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Note handlers
  const handleSaveNote = async () => {
    if (!noteForm.title.trim()) {
      toast.error('Title required');
      return;
    }

    try {
      const url = editingNote ? `/api/hub/notes/${editingNote.id}` : '/api/hub/notes';
      const method = editingNote ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteForm),
      });

      const data = await response.json();

      if (data.note) {
        if (editingNote) {
          setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
        } else {
          setNotes(prev => [data.note, ...prev]);
        }
        toast.success(editingNote ? 'Note updated' : 'Note created');
      }

      closeNoteModal();
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      await fetch(`/api/hub/notes/${id}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await fetch(`/api/hub/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });

      const data = await response.json();
      if (data.note) {
        setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
      }
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const openNoteModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNoteForm({ title: note.title, content: note.content, color: note.color });
    } else {
      setEditingNote(null);
      setNoteForm({ title: '', content: '', color: 'default' });
    }
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    setEditingNote(null);
    setNoteForm({ title: '', content: '', color: 'default' });
  };

  // Todo handlers
  const handleSaveTodo = async () => {
    if (!todoForm.title.trim()) {
      toast.error('Title required');
      return;
    }

    try {
      const url = editingTodo ? `/api/hub/todos/${editingTodo.id}` : '/api/hub/todos';
      const method = editingTodo ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...todoForm,
          dueDate: todoForm.dueDate || null,
        }),
      });

      const data = await response.json();

      if (data.todo) {
        if (editingTodo) {
          setTodos(prev => prev.map(t => t.id === data.todo.id ? data.todo : t));
        } else {
          setTodos(prev => [data.todo, ...prev]);
        }
        toast.success(editingTodo ? 'Todo updated' : 'Todo created');
      }

      closeTodoModal();
    } catch (error) {
      toast.error('Failed to save todo');
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const response = await fetch(`/api/hub/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !todo.isCompleted }),
      });

      const data = await response.json();
      if (data.todo) {
        setTodos(prev => prev.map(t => t.id === data.todo.id ? data.todo : t));
      }
    } catch (error) {
      toast.error('Failed to update todo');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!confirm('Delete this todo?')) return;

    try {
      await fetch(`/api/hub/todos/${id}`, { method: 'DELETE' });
      setTodos(prev => prev.filter(t => t.id !== id));
      toast.success('Todo deleted');
    } catch (error) {
      toast.error('Failed to delete todo');
    }
  };

  const openTodoModal = (todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo);
      setTodoForm({
        title: todo.title,
        description: todo.description || '',
        priority: todo.priority,
        dueDate: todo.dueDate ? todo.dueDate.split('T')[0] : '',
      });
    } else {
      setEditingTodo(null);
      setTodoForm({ title: '', description: '', priority: 'medium', dueDate: '' });
    }
    setShowTodoModal(true);
  };

  const closeTodoModal = () => {
    setShowTodoModal(false);
    setEditingTodo(null);
    setTodoForm({ title: '', description: '', priority: 'medium', dueDate: '' });
  };

  // Sort notes and todos
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const sortedTodos = [...todos].sort((a, b) => {
    if (!a.isCompleted && b.isCompleted) return -1;
    if (a.isCompleted && !b.isCompleted) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const tabs = [
    { id: 'notes', label: 'Notes', icon: HiOutlineDocumentText, count: notes.length },
    { id: 'todos', label: 'Todos', icon: HiOutlineClipboardList, count: todos.filter(t => !t.isCompleted).length },
    { id: 'activity', label: 'Activity', icon: HiOutlineClock, count: activities.length },
  ];

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Badge variant="primary" className="mb-2">Personal Hub</Badge>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Personal Hub
        </h1>
        <p className="text-dark-400">
          Manage your notes, todos, and track your activities
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-dark-800 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id ? 'bg-white/20' : 'bg-dark-700'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <>
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={() => openNoteModal()} leftIcon={<HiOutlinePlus className="w-5 h-5" />}>
                  New Note
                </Button>
              </div>

              {sortedNotes.length === 0 ? (
                <EmptyState
                  icon={<HiOutlineDocumentText className="w-16 h-16" />}
                  title="No notes yet"
                  description="Create your first note to get started"
                  action={
                    <Button onClick={() => openNoteModal()} leftIcon={<HiOutlinePlus className="w-5 h-5" />}>
                      Create Note
                    </Button>
                  }
                />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedNotes.map(note => {
                    const colorClass = noteColors.find(c => c.name === note.color)?.class || noteColors[0].class;
                    
                    return (
                      <div
                        key={note.id}
                        className={cn(
                          'group p-4 rounded-xl border transition-all hover:shadow-lg cursor-pointer',
                          colorClass
                        )}
                        onClick={() => openNoteModal(note)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-white flex items-center gap-2">
                            {note.isPinned && <HiOutlineStar className="w-4 h-4 text-yellow-500" />}
                            {note.title}
                          </h3>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(note);
                              }}
                              className="p-1 rounded hover:bg-dark-700"
                            >
                              <HiOutlineStar className={cn(
                                'w-4 h-4',
                                note.isPinned ? 'text-yellow-500 fill-yellow-500' : 'text-dark-400'
                              )} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note.id);
                              }}
                              className="p-1 rounded hover:bg-red-500/20 text-dark-400 hover:text-red-400"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-dark-400 text-sm line-clamp-3 mb-3">
                          {note.content || 'No content'}
                        </p>
                        <p className="text-xs text-dark-500">
                          {formatRelativeTime(note.updatedAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Todos Tab */}
          {activeTab === 'todos' && (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={() => openTodoModal()} leftIcon={<HiOutlinePlus className="w-5 h-5" />}>
                  New Todo
                </Button>
              </div>

              {sortedTodos.length === 0 ? (
                <EmptyState
                  icon={<HiOutlineClipboardList className="w-16 h-16" />}
                  title="No todos yet"
                  description="Create your first todo to get started"
                  action={
                    <Button onClick={() => openTodoModal()} leftIcon={<HiOutlinePlus className="w-5 h-5" />}>
                      Create Todo
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {sortedTodos.map(todo => {
                    const priority = priorities.find(p => p.value === todo.priority);
                    
                    return (
                      <div
                        key={todo.id}
                        className={cn(
                          'group flex items-center gap-3 p-4 rounded-xl border bg-dark-800/50 border-dark-700 transition-all',
                          todo.isCompleted && 'opacity-60'
                        )}
                      >
                        <button
                          onClick={() => handleToggleTodo(todo)}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                            todo.isCompleted
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-dark-500 hover:border-primary-500'
                          )}
                        >
                          {todo.isCompleted && <HiOutlineCheck className="w-4 h-4 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0" onClick={() => openTodoModal(todo)}>
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              'font-medium text-white',
                              todo.isCompleted && 'line-through'
                            )}>
                              {todo.title}
                            </h3>
                            <span className={cn('text-xs', priority?.color)}>
                              {priority?.label}
                            </span>
                          </div>
                          {todo.description && (
                            <p className="text-sm text-dark-400 truncate">{todo.description}</p>
                          )}
                          {todo.dueDate && (
                            <p className="text-xs text-dark-500 mt-1">
                              Due: {new Date(todo.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-all"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <>
              {activities.length === 0 ? (
                <EmptyState
                  icon={<HiOutlineClock className="w-16 h-16" />}
                  title="No activity yet"
                  description="Your recent activities will appear here"
                />
              ) : (
                <Card>
                  <div className="space-y-4">
                    {activities.map((activity, i) => (
                      <div
                        key={activity.id}
                        className={cn(
                          'flex items-start gap-3 pb-4',
                          i !== activities.length - 1 && 'border-b border-dark-700'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          activity.type === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                          activity.type === 'tool' ? 'bg-purple-500/20 text-purple-400' :
                          activity.type === 'ml_check' ? 'bg-orange-500/20 text-orange-400' :
                          activity.type === 'login' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-dark-700 text-dark-400'
                        )}>
                          {activity.type === 'chat' ? <HiOutlineDocumentText className="w-4 h-4" /> :
                           activity.type === 'tool' ? <HiOutlineClipboardList className="w-4 h-4" /> :
                           <HiOutlineClock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white">{activity.action}</p>
                          <p className="text-xs text-dark-500">{formatRelativeTime(activity.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Note Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={closeNoteModal}
        title={editingNote ? 'Edit Note' : 'New Note'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Note title..."
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
          />
          <Textarea
            label="Content"
            placeholder="Write your note..."
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            rows={6}
          />
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Color</label>
            <div className="flex gap-2">
              {noteColors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setNoteForm({ ...noteForm, color: color.name })}
                  className={cn(
                    'w-8 h-8 rounded-lg border-2 transition-all',
                    color.class,
                    noteForm.color === color.name ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-dark-800' : ''
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeNoteModal}>Cancel</Button>
            <Button onClick={handleSaveNote}>
              {editingNote ? 'Save Changes' : 'Create Note'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Todo Modal */}
      <Modal
        isOpen={showTodoModal}
        onClose={closeTodoModal}
        title={editingTodo ? 'Edit Todo' : 'New Todo'}
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="What needs to be done?"
            value={todoForm.title}
            onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Add details..."
            value={todoForm.description}
            onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">Priority</label>
              <div className="flex gap-2">
                {priorities.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setTodoForm({ ...todoForm, priority: p.value })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      todoForm.priority === p.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 text-dark-300 hover:text-white'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Due Date (optional)"
              type="date"
              value={todoForm.dueDate}
              onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={closeTodoModal}>Cancel</Button>
            <Button onClick={handleSaveTodo}>
              {editingTodo ? 'Save Changes' : 'Create Todo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
