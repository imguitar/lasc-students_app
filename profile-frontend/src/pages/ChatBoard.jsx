import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { chatBoardService } from '../services';
import { getSocket } from '../services/socket';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  X,
  Reply,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ArrowLeft,
  Search,
  Users,
  Building2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Download,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Circle
} from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏', '🙏', '✨', '💡', '🚀', '💯', '👌', '😊', '😍'];

// Format Thai Time: "14:30 น."
const formatThaiTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} น.`;
};

// Format Date divider (e.g. "วันนี้", "เมื่อวาน", "28 ก.ย. 2569")
const formatMessageDateGroup = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'วันนี้';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'เมื่อวาน';
  }

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Get Role and Year badge
const getAuthorBadge = (role, year) => {
  if (role === 'admin') {
    return { label: 'ผู้ดูแลระบบ', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  }
  if (role === 'teacher' || role === 'advisor') {
    return { label: 'อาจารย์', color: 'bg-purple-100 text-purple-800 border-purple-300' };
  }
  if (role === 'alumni') {
    return { label: 'ศิษย์เก่า', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
  // Student
  if (year) {
    return { label: `นักศึกษาปี ${year}`, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
  }
  return { label: 'นักศึกษา', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
};

// Clean and format room title to remove any corrupt question marks or prefixes
const formatRoomTitle = (room) => {
  if (!room) return '';
  if (room.department_name) {
    const cleanDept = room.department_name.replace(/^[?\s]+/, '').trim();
    return `ห้องแชท${cleanDept}`;
  }
  const rawName = room.name || '';
  const cleaned = rawName.replace(/^[?\s]+/, '').trim();
  if (cleaned.startsWith('ห้องแชท') || cleaned.startsWith('ห้องพูดคุย')) {
    return cleaned;
  }
  return `ห้องแชท${cleaned}`;
};

const ChatBoard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Search & Filters
  const [roomSearch, setRoomSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Input & Reply state
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Scroll management
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadNewCount, setUnreadNewCount] = useState(0);

  // Mobile sidebar visibility (toggle between room list and chat view on mobile)
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  // Image lightbox modal
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);

  // Current logged in user username / profile ID
  const currentUsername = user?.username;

  // ----------------------------------------------------
  // 1. Initial Load: Fetch accessible chat rooms
  // ----------------------------------------------------
  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const res = await chatBoardService.getRooms();
      if (res.success && res.data) {
        setRooms(res.data);
        if (res.data.length > 0 && !activeRoom) {
          setActiveRoom(res.data[0]);
          setMobileView('chat');
        }
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || 'ไม่สามารถโหลดห้องแชทได้',
        variant: 'destructive'
      });
    } finally {
      setLoadingRooms(false);
    }
  }, [toast, activeRoom]);

  useEffect(() => {
    fetchRooms();
  }, []);

  // ----------------------------------------------------
  // 2. Fetch Messages for Active Room
  // ----------------------------------------------------
  const fetchMessages = useCallback(async (roomId, beforeId = null) => {
    if (!roomId) return;
    try {
      if (!beforeId) {
        setLoadingMessages(true);
      } else {
        setLoadingOlder(true);
      }

      const params = { limit: 40 };
      if (beforeId) params.before_id = beforeId;
      if (messageSearch) params.search = messageSearch;

      const res = await chatBoardService.getMessages(roomId, params);
      if (res.success) {
        if (beforeId) {
          // Prepend older messages
          setMessages((prev) => [...res.data, ...prev]);
        } else {
          setMessages(res.data);
          // Scroll to bottom on initial room load
          setTimeout(() => scrollToBottom(false), 100);
        }
        setHasMore(res.has_more);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || 'ไม่สามารถโหลดข้อความได้',
        variant: 'destructive'
      });
    } finally {
      setLoadingMessages(false);
      setLoadingOlder(false);
    }
  }, [messageSearch, toast]);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages(activeRoom.id);
      setReplyingTo(null);
      setEditingMessage(null);
      setUnreadNewCount(0);
      setTypingUsers([]);
    }
  }, [activeRoom, messageSearch]);

  // ----------------------------------------------------
  // 3. Socket.IO Real-time Integration
  // ----------------------------------------------------
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeRoom) return;

    // Join room
    socket.emit('join_room', activeRoom.id);

    // Handler for new incoming message
    const handleNewMessage = (newMsg) => {
      if (newMsg.room_id !== activeRoom.id) return;

      setMessages((prev) => {
        // Prevent duplicate if already added
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update last message in room list
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          r.id === newMsg.room_id
            ? { ...r, last_message: newMsg, updated_at: newMsg.created_at }
            : r
        )
      );

      // Check if user is near bottom
      const container = chatScrollContainerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom || newMsg.author_profile_id === currentUsername) {
          setTimeout(() => scrollToBottom(true), 50);
        } else {
          setUnreadNewCount((prev) => prev + 1);
          setShowScrollBottom(true);
        }
      }
    };

    // Handler for message update
    const handleMessageUpdated = (updatedMsg) => {
      if (updatedMsg.room_id !== activeRoom.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
    };

    // Handler for message delete
    const handleMessageDeleted = ({ messageId, roomId }) => {
      if (roomId !== activeRoom.id) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    // Handler for reactions update
    const handleReactionUpdated = ({ messageId, roomId, reactions }) => {
      if (roomId !== activeRoom.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    // Handler for typing indicator
    const handleUserTyping = ({ roomId, userId, profileId, userName }) => {
      if (roomId !== activeRoom.id || profileId === currentUsername) return;
      setTypingUsers((prev) => {
        if (!prev.some((u) => u.profileId === profileId)) {
          return [...prev, { profileId, userName }];
        }
        return prev;
      });
    };

    const handleUserStopTyping = ({ roomId, profileId }) => {
      if (roomId !== activeRoom.id) return;
      setTypingUsers((prev) => prev.filter((u) => u.profileId !== profileId));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.emit('leave_room', activeRoom.id);
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [activeRoom, currentUsername]);

  // ----------------------------------------------------
  // 4. Scroll Handlers
  // ----------------------------------------------------
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto'
      });
      setShowScrollBottom(false);
      setUnreadNewCount(0);
    }
  };

  const handleScroll = () => {
    const container = chatScrollContainerRef.current;
    if (!container) return;

    // Detect if scrolled up
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    setShowScrollBottom(!isAtBottom);
    if (isAtBottom) {
      setUnreadNewCount(0);
    }

    // Load older messages when scrolling to top
    if (container.scrollTop === 0 && hasMore && !loadingOlder && messages.length > 0) {
      const oldestId = messages[0].id;
      const prevScrollHeight = container.scrollHeight;
      fetchMessages(activeRoom.id, oldestId).then(() => {
        // Maintain scroll position after prepending
        setTimeout(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        }, 50);
      });
    }
  };

  // ----------------------------------------------------
  // 5. Typing Handlers
  // ----------------------------------------------------
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const socket = getSocket();
    if (socket && activeRoom) {
      socket.emit('typing_start', { roomId: activeRoom.id });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { roomId: activeRoom.id });
      }, 2000);
    }
  };

  // ----------------------------------------------------
  // 6. Send Message / Edit Message
  // ----------------------------------------------------
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!activeRoom) return;

    const trimmed = inputText.trim();
    if (!trimmed && !selectedFile) return;

    // If editing existing message
    if (editingMessage) {
      try {
        const res = await chatBoardService.editMessage(editingMessage.id, {
          message: trimmed
        });
        if (res.success) {
          setEditingMessage(null);
          setInputText('');
          toast({ title: 'แก้ไขข้อความเรียบร้อย' });
        }
      } catch (err) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: err.response?.data?.message || 'ไม่สามารถแก้ไขข้อความได้',
          variant: 'destructive'
        });
      }
      return;
    }

    // Sending new message
    try {
      let filePayload = {};
      if (selectedFile) {
        setUploadingFile(true);
        const uploadRes = await chatBoardService.uploadAttachment(selectedFile.file);
        if (uploadRes.success) {
          const { url, fileName, fileSize, fileType, isImage } = uploadRes.data;
          if (isImage) {
            filePayload.image_url = url;
          } else {
            filePayload.file_url = url;
            filePayload.file_name = fileName;
            filePayload.file_size = fileSize;
            filePayload.file_type = fileType;
          }
        }
        setSelectedFile(null);
      }

      const payload = {
        message: trimmed,
        reply_to_message_id: replyingTo ? replyingTo.id : null,
        ...filePayload
      };

      setInputText('');
      setReplyingTo(null);
      setShowEmojiPicker(false);

      // Stop typing
      const socket = getSocket();
      if (socket && activeRoom) {
        socket.emit('typing_stop', { roomId: activeRoom.id });
      }

      const res = await chatBoardService.sendMessage(activeRoom.id, payload);
      if (res.success) {
        // Immediate UI feedback
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || 'ไม่สามารถส่งข้อความได้',
        variant: 'destructive'
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ----------------------------------------------------
  // 7. Delete Message
  // ----------------------------------------------------
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อความนี้?')) return;
    try {
      const res = await chatBoardService.deleteMessage(messageId);
      if (res.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        toast({ title: 'ลบข้อความสำเร็จ' });
      }
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || 'ไม่สามารถลบข้อความได้',
        variant: 'destructive'
      });
    }
  };

  // ----------------------------------------------------
  // 8. Reactions
  // ----------------------------------------------------
  const handleToggleReaction = async (messageId, reactionType) => {
    try {
      const res = await chatBoardService.toggleReaction(messageId, reactionType);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: res.data } : m))
        );
      }
    } catch (err) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || 'ไม่สามารถทำรายการได้',
        variant: 'destructive'
      });
    }
  };

  // ----------------------------------------------------
  // 9. File Selection
  // ----------------------------------------------------
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'ไฟล์มีขนาดใหญ่เกินไป',
        description: 'กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 20 MB',
        variant: 'destructive'
      });
      return;
    }

    const isImage = file.type.startsWith('image/');
    setSelectedFile({
      file,
      name: file.name,
      size: file.size,
      isImage,
      previewUrl: isImage ? URL.createObjectURL(file) : null
    });
    e.target.value = '';
  };

  // ----------------------------------------------------
  // 10. Copy message text
  // ----------------------------------------------------
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'คัดลอกข้อความแล้ว' });
  };

  // Filtered rooms for sidebar
  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.department_name.toLowerCase().includes(roomSearch.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80 shadow-md">
      <div className="flex-1 flex overflow-hidden relative">

        {/* ============================================================== */}
        {/* LEFT COLUMN: ROOMS SIDEBAR                                     */}
        {/* ============================================================== */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200/90 flex flex-col z-10 transition-all duration-200 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-800 leading-tight">
                    แชทสาขาวิชา
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">Group Chat ประจำสาขา</p>
                </div>
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchRooms}
                title="รีเฟรชห้องแชท"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRooms ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Room Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาห้องสาขาวิชา..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Room List Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {loadingRooms ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                กำลังโหลดห้องแชท...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                {roomSearch ? 'ไม่พบห้องที่ตรงกับการค้นหา' : 'ยังไม่มีห้องแชทประจำสาขาของคุณ'}
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = activeRoom?.id === room.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveRoom(room);
                      setMobileView('chat');
                    }}
                    className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/80 border border-indigo-100 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {/* Department Avatar / Badge */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-indigo-100">
                        {room.department_name ? room.department_name.substring(0, 2) : 'สาขา'}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>

                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h2 className="text-xs font-bold text-slate-800 truncate">
                          {formatRoomTitle(room)}
                        </h2>
                        {room.last_message && (
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatThaiTime(room.last_message.created_at)}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mb-1">
                        {room.last_message
                          ? `${room.last_message.author_name}: ${room.last_message.message}`
                          : 'ยังไม่มีข้อความ เริ่มต้นพูดคุยได้เลย'}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3 text-slate-400" />
                          {room.member_count} สมาชิก
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: MAIN GROUP CHAT INTERFACE                        */}
        {/* ============================================================== */}
        <div
          className={`flex-1 flex flex-col bg-slate-100/60 overflow-hidden ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeRoom ? (
            <>
              {/* ---------------------------------------------------- */}
              {/* CHAT HEADER                                          */}
              {/* ---------------------------------------------------- */}
              <div className="h-16 px-4 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-xs z-10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="กลับไปยังรายการห้อง"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-indigo-100">
                    <Building2 className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 truncate flex items-center gap-2">
                      <span>{formatRoomTitle(activeRoom)}</span>
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        สมาชิก {activeRoom.member_count || 0} คน
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        ออนไลน์ในสาขา
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Header Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Search in chat toggle */}
                  <div className="relative">
                    {isSearchOpen ? (
                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <input
                          type="text"
                          placeholder="ค้นหาข้อความ..."
                          value={messageSearch}
                          onChange={(e) => setMessageSearch(e.target.value)}
                          className="px-2 py-1 text-xs bg-transparent focus:outline-none w-32 sm:w-48"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            setIsSearchOpen(false);
                            setMessageSearch('');
                          }}
                          className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                        title="ค้นหาข้อความในห้องนี้"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* MESSAGES FEED AREA                                   */}
              {/* ---------------------------------------------------- */}
              <div
                ref={chatScrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative"
              >
                {/* Older Messages Loading Indicator */}
                {hasMore && (
                  <div className="text-center py-2">
                    <button
                      onClick={() => {
                        if (messages.length > 0) {
                          fetchMessages(activeRoom.id, messages[0].id);
                        }
                      }}
                      disabled={loadingOlder}
                      className="px-3 py-1 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded-full shadow-xs hover:bg-indigo-50 transition inline-flex items-center gap-1"
                    >
                      {loadingOlder ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          กำลังโหลดข้อความก่อนหน้า...
                        </>
                      ) : (
                        'โหลดข้อความก่อนหน้า'
                      )}
                    </button>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    กำลังโหลดข้อความ...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3 shadow-inner">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">
                      {messageSearch ? 'ไม่พบข้อความที่ตรงกับการค้นหา' : 'ยังไม่มีข้อความในห้องนี้'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs">
                      {messageSearch
                        ? 'ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง'
                        : 'เริ่มต้นการพูดคุยกับเพื่อนๆ อาจารย์ และศิษย์เก่าในสาขาวิชาของคุณเป็นคนแรก!'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = msg.author_profile_id === currentUsername;
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const isSameSenderAsPrev =
                      prevMsg &&
                      prevMsg.author_profile_id === msg.author_profile_id &&
                      new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;

                    // Date Divider
                    const showDateDivider =
                      !prevMsg ||
                      new Date(msg.created_at).toDateString() !==
                        new Date(prevMsg.created_at).toDateString();

                    const badge = getAuthorBadge(msg.author_role, msg.author_year);

                    // Group reactions
                    const reactionCounts = (msg.reactions || []).reduce((acc, r) => {
                      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
                      return acc;
                    }, {});

                    const userReactedTypes = (msg.reactions || [])
                      .filter((r) => r.user_profile_id === currentUsername)
                      .map((r) => r.reaction_type);

                    return (
                      <React.Fragment key={msg.id}>
                        {/* Date Divider Header */}
                        {showDateDivider && (
                          <div className="flex items-center justify-center my-4">
                            <span className="px-3 py-1 bg-white border border-slate-200/90 text-slate-500 text-[11px] font-semibold rounded-full shadow-xs">
                              {formatMessageDateGroup(msg.created_at)}
                            </span>
                          </div>
                        )}

                        {/* Chat Row */}
                        <div
                          id={`msg-${msg.id}`}
                          className={`group flex items-end gap-2 ${
                            isOwn ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {/* Avatar for other users (only on first message in group) */}
                          {!isOwn && (
                            <div className="w-8 shrink-0">
                              {!isSameSenderAsPrev ? (
                                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-600 shadow-xs">
                                  {msg.author?.avatar_url ? (
                                    <img
                                      src={msg.author.avatar_url}
                                      alt={msg.author_name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    msg.author_name ? msg.author_name.charAt(0) : 'U'
                                  )}
                                </div>
                              ) : (
                                <div className="w-8" />
                              )}
                            </div>
                          )}

                          {/* Message Content Container */}
                          <div
                            className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${
                              isOwn ? 'items-end' : 'items-start'
                            }`}
                          >
                            {/* Author Name and Role (show once per cluster for other users) */}
                            {!isOwn && !isSameSenderAsPrev && (
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span className="text-xs font-bold text-slate-800">
                                  {msg.author_name}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 border rounded-md ${badge.color}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                            )}

                            {/* Relative Wrapper for Bubble + Hover Menu */}
                            <div className="relative group/bubble">
                              {/* Hover Floating Action Bar */}
                              <div
                                className={`absolute -top-7 hidden group-hover/bubble:flex items-center gap-0.5 bg-white border border-slate-200/90 rounded-xl px-1.5 py-0.5 shadow-md z-20 ${
                                  isOwn ? 'right-0' : 'left-0'
                                }`}
                              >
                                {/* Quick Reactions */}
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className="p-1 text-xs hover:scale-125 transition"
                                    title={`กด ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}

                                <div className="w-px h-3 bg-slate-200 mx-0.5" />

                                {/* Reply */}
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
                                  title="ตอบกลับ"
                                >
                                  <Reply className="w-3.5 h-3.5" />
                                </button>

                                {/* Copy text */}
                                <button
                                  onClick={() => handleCopyText(msg.message)}
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
                                  title="คัดลอกข้อความ"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit (own only) */}
                                {isOwn && (
                                  <button
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setInputText(msg.message);
                                    }}
                                    className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-md transition"
                                    title="แก้ไขข้อความ"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete (own or admin) */}
                                {(isOwn || user?.role === 'admin') && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md transition"
                                    title="ลบข้อความ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Bubble Card */}
                              <div
                                className={`rounded-2xl px-3.5 py-2.5 shadow-xs break-words ${
                                  isOwn
                                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-br-xs'
                                    : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                                }`}
                              >
                                {/* Quoted Reply Block */}
                                {msg.replyTo && (
                                  <div
                                    onClick={() => {
                                      const targetEl = document.getElementById(
                                        `msg-${msg.replyTo.id}`
                                      );
                                      if (targetEl) {
                                        targetEl.scrollIntoView({
                                          behavior: 'smooth',
                                          block: 'center'
                                        });
                                        targetEl.classList.add('bg-indigo-50/50');
                                        setTimeout(
                                          () => targetEl.classList.remove('bg-indigo-50/50'),
                                          1500
                                        );
                                      }
                                    }}
                                    className={`mb-2 p-2 rounded-xl text-xs cursor-pointer border-l-3 transition ${
                                      isOwn
                                        ? 'bg-white/15 border-white text-white/90 hover:bg-white/20'
                                        : 'bg-slate-50 border-indigo-500 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 font-bold text-[11px] mb-0.5">
                                      <Reply className="w-3 h-3 rotate-180" />
                                      <span>{msg.replyTo.author_name}</span>
                                    </div>
                                    <p className="line-clamp-2 text-[11px] opacity-90">
                                      {msg.replyTo.message}
                                    </p>
                                  </div>
                                )}

                                {/* Image Attachment */}
                                {msg.image_url && (
                                  <div className="mb-2 rounded-xl overflow-hidden cursor-pointer">
                                    <img
                                      src={msg.image_url}
                                      alt="แนบรูปภาพ"
                                      onClick={() => setLightboxImage(msg.image_url)}
                                      className="max-h-64 rounded-xl object-cover hover:opacity-95 transition"
                                    />
                                  </div>
                                )}

                                {/* File Attachment */}
                                {msg.file_url && (
                                  <div
                                    className={`mb-2 p-2.5 rounded-xl flex items-center gap-3 border ${
                                      isOwn
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <div className="w-9 h-9 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold truncate">
                                        {msg.file_name || 'ไฟล์แนบ'}
                                      </p>
                                      <p className="text-[10px] opacity-75">
                                        {formatFileSize(msg.file_size)}
                                      </p>
                                    </div>
                                    <a
                                      href={msg.file_url}
                                      download={msg.file_name || 'download'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`p-1.5 rounded-lg transition shrink-0 ${
                                        isOwn
                                          ? 'hover:bg-white/20 text-white'
                                          : 'hover:bg-slate-200 text-slate-600'
                                      }`}
                                      title="ดาวน์โหลดไฟล์"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                )}

                                {/* Text Message */}
                                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                  {msg.message}
                                </p>

                                {/* Footer: Edited Tag + Timestamp */}
                                <div
                                  className={`flex items-center gap-1.5 mt-1 justify-end text-[10px] ${
                                    isOwn ? 'text-white/75' : 'text-slate-400'
                                  }`}
                                >
                                  {msg.is_edited && (
                                    <span className="italic">(แก้ไขแล้ว)</span>
                                  )}
                                  <span>{formatThaiTime(msg.created_at)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reactions Display Pills */}
                            {Object.keys(reactionCounts).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 px-1">
                                {Object.entries(reactionCounts).map(([emoji, count]) => {
                                  const isUserReacted = userReactedTypes.includes(emoji);
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleToggleReaction(msg.id, emoji)}
                                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition shadow-2xs ${
                                        isUserReacted
                                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span>{count}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}

                {/* Typing Indicator Bubble */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/80 border border-slate-200/60 rounded-full px-3 py-1 w-fit shadow-xs animate-fade-in">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                    <span className="font-medium">
                      {typingUsers.map((u) => u.userName).join(', ')} กำลังพิมพ์...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Floating "Scroll to Bottom" Button */}
              {showScrollBottom && (
                <div className="absolute bottom-20 right-6 z-20">
                  <button
                    onClick={() => scrollToBottom(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition transform hover:scale-105"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>
                      เลื่อนลงล่างสุด {unreadNewCount > 0 && `(${unreadNewCount} ข้อความใหม่)`}
                    </span>
                  </button>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* INPUT BAR & CONTROLS                                 */}
              {/* ---------------------------------------------------- */}
              <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
                {/* Replying Banner */}
                {replyingTo && (
                  <div className="flex items-center justify-between bg-indigo-50/80 border border-indigo-100 rounded-xl px-3 py-1.5 mb-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Reply className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-slate-500 font-medium">กำลังตอบกลับ:</span>
                      <span className="font-bold text-slate-700 truncate">
                        {replyingTo.author_name}
                      </span>
                      <span className="text-slate-400 truncate max-w-xs">
                        "{replyingTo.message}"
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Editing Banner */}
                {editingMessage && (
                  <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-xl px-3 py-1.5 mb-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Edit2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-amber-800 font-bold">กำลังแก้ไขข้อความ</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMessage(null);
                        setInputText('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Selected File Preview Banner */}
                {selectedFile && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 mb-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedFile.isImage ? (
                        <img
                          src={selectedFile.previewUrl}
                          alt="preview"
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-indigo-600" />
                      )}
                      <span className="font-semibold text-slate-700 truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="p-2 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-wrap gap-1.5 max-w-sm">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInputText((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Input Form */}
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  {/* File Upload Hidden Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                    className="hidden"
                  />

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition shrink-0"
                    title="แนบรูปภาพหรือไฟล์ (สูงสุด 20MB)"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  {/* Emoji Picker Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 text-slate-500 hover:text-amber-500 hover:bg-slate-100 rounded-xl transition shrink-0"
                    title="เลือก Emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Text Input / Textarea */}
                  <div className="flex-1 relative">
                    <textarea
                      rows={1}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        editingMessage
                          ? 'แก้ไขข้อความ...'
                          : 'พิมพ์ข้อความในสาขาวิชา... (Enter เพื่อส่ง)'
                      }
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white resize-none transition max-h-32"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !selectedFile) || uploadingFile}
                    className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition shrink-0 shadow-sm ${
                      (inputText.trim() || selectedFile) && !uploadingFile
                        ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-indigo-200 hover:shadow-md'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title="ส่งข้อความ"
                  >
                    {uploadingFile ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Building2 className="w-12 h-12 mb-3 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700 mb-1">
                กรุณาเลือกห้องแชทสาขาวิชา
              </h3>
              <p className="text-xs max-w-xs">
                เลือกห้องแชทจากแถบด้านซ้ายเพื่อเริ่มต้นการสนทนากับเพื่อนและอาจารย์ในสาขา
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="fullscreen preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBoard;
