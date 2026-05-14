import React, { useEffect, useState, useRef } from 'react';
import { Employee } from '../App';
import { isAdmin } from '../utils/roles';
import { formatDate } from '../utils/date';

interface AnnouncementsProps {
  user: Employee;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  attachment: string;
  attachment_name: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export default function Announcements({ user }: AnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const res = await fetch('/api/announcements');
    const data = await res.json();
    setAnnouncements(data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
      return;
    }
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          attachment,
          attachment_name: attachmentName,
          created_by: user.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setShowForm(false);
        setTitle('');
        setContent('');
        setAttachment(null);
        setAttachmentName('');
        fetchAnnouncements();
      }
    } catch {
      setMessage('เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันลบประกาศนี้?')) return;
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    fetchAnnouncements();
    if (selectedAnnouncement?.id === id) setSelectedAnnouncement(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">📢 ประกาศ</h2>
        {isAdmin(user.role) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            {showForm ? 'ยกเลิก' : '+ สร้างประกาศ'}
          </button>
        )}
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg">{message}</div>
      )}

      {/* Create Form (Admin only) */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">สร้างประกาศใหม่</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="หัวข้อประกาศ"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เนื้อหา</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={5}
                placeholder="รายละเอียดประกาศ..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">แนบไฟล์ (ถ้ามี)</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {attachmentName && (
                <p className="text-xs text-green-600 mt-1">📎 {attachmentName}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">รองรับ PDF, Word, Excel, รูปภาพ (สูงสุด 5MB)</p>
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              📢 เผยแพร่ประกาศ
            </button>
          </form>
        </div>
      )}

      {/* View Announcement Detail */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAnnouncement(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">{selectedAnnouncement.title}</h3>
              <button onClick={() => setSelectedAnnouncement(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              โดย {selectedAnnouncement.first_name} {selectedAnnouncement.last_name} • {formatDate(selectedAnnouncement.created_at.split(' ')[0])}
            </p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
              {selectedAnnouncement.content}
            </div>
            {selectedAnnouncement.attachment && (
              <div className="border-t pt-4">
                <a
                  href={selectedAnnouncement.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 text-sm font-medium"
                >
                  📎 ดาวน์โหลด: {selectedAnnouncement.attachment_name}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            ยังไม่มีประกาศ
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-green-500"
              onClick={() => setSelectedAnnouncement(a)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 text-lg">{a.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>👤 {a.first_name} {a.last_name}</span>
                    <span>📅 {formatDate(a.created_at.split(' ')[0])}</span>
                    {a.attachment && <span className="text-green-600">📎 มีไฟล์แนบ</span>}
                  </div>
                </div>
                {isAdmin(user.role) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                    className="text-red-400 hover:text-red-600 text-sm ml-2"
                    title="ลบประกาศ"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
