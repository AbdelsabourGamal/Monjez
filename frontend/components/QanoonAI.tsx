import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language, ChatSession, LegalProject, AITone } from '../types';
import { Send, Bot, User, Sparkles, Paperclip, X, FileImage, AlertCircle, ChevronDown, Scale, BookOpen, Globe, History, Plus, FolderOpen, Settings, ArrowRight, MessageSquare, Menu, Trash2, ArrowLeft, FileText, VenetianMask, EyeOff } from 'lucide-react';
import { getLegalAdvice } from '../services/geminiService';
import { secureGetItem, secureSetItem } from '../utils/secureStorage';

interface QanoonAIProps {
  notify: (msg: string, type: 'success' | 'error') => void;
  setCurrentView: (view: string) => void;
}

const CustomDropdown = ({ label, options, selected, onSelect, isOpen, setIsOpen, icon: Icon }: any) => (
    <div className="relative">
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-600 min-w-[100px]"
        >
            {Icon && <Icon size={16} className="text-gray-500"/>}
            <div className="text-left rtl:text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1 whitespace-nowrap">
                    {options.find((o: any) => o.id === selected)?.label} 
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </div>
        </button>
        
        {isOpen && (
            <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                <div className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-in zoom-in-95 slide-in-from-top-2 duration-200">
                    {options.map((opt: any) => (
                        <button
                            key={opt.id}
                            onClick={() => { onSelect(opt.id); setIsOpen(false); }}
                            className={`w-full text-left rtl:text-right px-4 py-3 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${selected === opt.id ? 'text-blue-600 bg-blue-50/50 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </>
        )}
    </div>
);

export const QanoonAI: React.FC<QanoonAIProps> = ({ notify, setCurrentView }) => {
  const { t, i18n } = useTranslation(['qanoonai', 'common']);
  const isRtl = i18n.dir() === 'rtl';

  // --- State Management ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [projects, setProjects] = useState<LegalProject[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string, type: string, data: string } | null>(null);
  
  // Settings & UI
  const [selectedCountry, setSelectedCountry] = useState<string>('kw');
  const [selectedTone, setSelectedTone] = useState<AITone>('formal');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isToneOpen, setIsToneOpen] = useState(false);
  
  // New Features
  const [isIncognito, setIsIncognito] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  
  // New Project Form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectFiles, setNewProjectFiles] = useState<{name: string, content: string, type: string}[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
      const storedSessions = secureGetItem('qanoon-sessions');
      if (storedSessions) setSessions(storedSessions);
      
      const storedProjects = secureGetItem('qanoon-projects');
      if (storedProjects) setProjects(storedProjects);
  }, []);

  useEffect(() => {
      // Do not save incognito sessions to persistent storage
      const sessionsToSave = sessions.filter(s => !s.isIncognito);
      secureSetItem('qanoon-sessions', sessionsToSave);
  }, [sessions]);

  useEffect(() => {
      secureSetItem('qanoon-projects', projects);
  }, [projects]);

  useEffect(() => {
      scrollToBottom();
  }, [currentSessionId, sessions]);

  const scrollToBottom = () => {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // --- Logic ---

  const activeSession = sessions.find(s => s.id === currentSessionId);
  const activeProject = projects.find(p => p.id === currentProjectId);

  const createNewSession = () => {
      const newSession: ChatSession = {
          id: Date.now().toString(),
          title: t('qanoonai:newConv'),
          date: new Date().toISOString(),
          messages: [],
          projectId: currentProjectId || undefined,
          isIncognito: isIncognito
      };
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setShowMobileSidebar(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm(t('qanoonai:deleteChatConfirm'))) {
          setSessions(prev => prev.filter(s => s.id !== id));
          if (currentSessionId === id) setCurrentSessionId(null);
      }
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm(t('qanoonai:deleteProjectConfirm'))) {
          setProjects(prev => prev.filter(p => p.id !== id));
          if (currentProjectId === id) setCurrentProjectId(null);
      }
  };

  const handleProjectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      
      Array.from(files).forEach((file: File) => {
          const reader = new FileReader();
          reader.onload = () => {
              setNewProjectFiles(prev => [...prev, {
                  name: file.name,
                  type: file.type,
                  content: `[Content of ${file.name} would be extracted here]` 
              }]);
          };
          reader.readAsText(file); 
      });
  };

  const saveNewProject = () => {
      if (!newProjectName) return;
      const newProject: LegalProject = {
          id: Date.now().toString(),
          name: newProjectName,
          knowledgeFiles: newProjectFiles,
          createdAt: new Date().toISOString()
      };
      setProjects([newProject, ...projects]);
      setCurrentProjectId(newProject.id);
      setShowProjectModal(false);
      setNewProjectName('');
      setNewProjectFiles([]);
      createNewSession(); // Auto start chat in this project
  };

  const handleSendMessage = async () => {
      if ((!input.trim() && !attachment) || isLoading) return;
      
      let sessionId = currentSessionId;
      if (!sessionId) {
          const newSession: ChatSession = {
              id: Date.now().toString(),
              title: input.substring(0, 30) + '...',
              date: new Date().toISOString(),
              messages: [],
              projectId: currentProjectId || undefined,
              isIncognito: isIncognito
          };
          setSessions([newSession, ...sessions]);
          sessionId = newSession.id;
          setCurrentSessionId(newSession.id);
      }

      const userMsgText = input;
      const userAttachment = attachment;
      const usingSearch = useWebSearch;
      
      setInput('');
      setAttachment(null);
      
      // Optimistic UI update
      setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              const newTitle = s.messages.length === 0 ? userMsgText.substring(0, 30) + (userMsgText.length > 30 ? '...' : '') : s.title;
              return {
                  ...s,
                  title: newTitle,
                  messages: [...s.messages, { role: 'user', text: userMsgText, attachment: userAttachment }]
              };
          }
          return s;
      }));

      setIsLoading(true);

      try {
          // Prepare History
          const session = sessions.find(s => s.id === sessionId) || { messages: [] };
          const history = (session.messages).map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
          }));

          // Prepare Project Context
          let projectContext = "";
          if (currentProjectId) {
              const proj = projects.find(p => p.id === currentProjectId);
              if (proj) {
                  projectContext = proj.knowledgeFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}`).join('\n\n');
              }
          }

          const countryName = t(`qanoonai:countries.${selectedCountry}`);
          const contextPrefix = t('qanoonai:jurisdictionContext', { country: countryName });
          const fullQuery = contextPrefix + " " + userMsgText + (usingSearch ? " " + t('qanoonai:webSearchHint') : "");

          const response = await getLegalAdvice(
              fullQuery,
              history,
              userAttachment ? { mimeType: userAttachment.type, data: userAttachment.data } : undefined,
              selectedTone,
              projectContext,
              usingSearch
          );

          setSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                  return {
                      ...s,
                      messages: [...s.messages, { role: 'user', text: userMsgText, attachment: userAttachment }, { role: 'model', text: response }]
                  };
              }
              return s;
          }));

      } catch (error) {
          console.error(error);
          notify(t('qanoonai:connectionError'), 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
          const result = reader.result as string;
          setAttachment({
              name: file.name,
              type: file.type,
              data: result.split(',')[1]
          });
      };
      reader.readAsDataURL(file);
  };

  const countryLabels = t('qanoonai:countries', { returnObjects: true }) as Record<string, string>;
  const countryOptions = Object.keys(countryLabels).map(id => ({ id, label: countryLabels[id] }));
  
  const toneLabels = t('qanoonai:tones', { returnObjects: true }) as Record<string, string>;
  const toneOptions = Object.keys(toneLabels).map(id => ({ id, label: toneLabels[id] }));

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 flex flex-col md:flex-row h-screen w-screen overflow-hidden">
        
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0 z-20">
            <button onClick={() => setShowMobileSidebar(true)} className="p-2 text-gray-600 dark:text-gray-300"><Menu size={24}/></button>
            <span className="font-bold text-lg text-gray-900 dark:text-white">{t('qanoonai:tab')}</span>
            <button onClick={() => setCurrentView('dashboard')} className="p-2 text-gray-600 dark:text-gray-300"><X size={24}/></button>
        </div>

        {/* Improved Sidebar */}
        <aside className={`
            fixed md:relative inset-y-0 left-0 rtl:left-auto rtl:right-0 z-30 w-80 
            bg-gray-50/90 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700 
            transform transition-transform duration-300 flex flex-col shadow-2xl md:shadow-none
            ${showMobileSidebar ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')} 
            md:translate-x-0 md:flex
        `}>
            {/* Sidebar Header */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Scale size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900 dark:text-white leading-none">{t('qanoonai:tab')}</h1>
                        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t('qanoonai:legalAssistant')}</span>
                    </div>
                </div>
                <button onClick={() => setShowMobileSidebar(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"><X size={20}/></button>
            </div>

            {/* New Chat Action */}
            <div className="p-5">
                <button 
                    onClick={createNewSession}
                    className="group w-full py-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl font-bold shadow-sm hover:shadow-md flex items-center justify-center gap-3 transition-all duration-300"
                >
                    <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={18} />
                    </div>
                    <span>{t('qanoonai:newChat')}</span>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-6">
                
                {/* Projects Section */}
                <div>
                    <div className="flex items-center justify-between px-2 mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('qanoonai:projects')}</span>
                        <button 
                            onClick={() => setShowProjectModal(true)} 
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            title={t('qanoonai:createProject')}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    
                    {projects.length === 0 ? (
                        <div className="text-center py-6 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                            <FolderOpen size={24} className="mx-auto text-gray-300 mb-2 opacity-50"/>
                            <p className="text-xs text-gray-400">{t('qanoonai:noProjects')}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {projects.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => { setCurrentProjectId(p.id); setCurrentSessionId(null); setShowMobileSidebar(false); }}
                                    className={`w-full text-left rtl:text-right px-3 py-3 rounded-xl text-sm flex items-center justify-between group transition-all duration-200 ${
                                        currentProjectId === p.id 
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    <span className="flex items-center gap-3 truncate">
                                        <FolderOpen size={16} className={currentProjectId === p.id ? 'text-amber-500 fill-amber-500/20' : 'opacity-70'}/> 
                                        {p.name}
                                    </span>
                                    <div onClick={(e) => deleteProject(e, p.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                        <Trash2 size={14}/>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* History Section */}
                <div>
                    <div className="px-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('qanoonai:history')}</div>
                    {sessions.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageSquare size={32} className="mx-auto text-gray-200 dark:text-gray-700 mb-2 opacity-50"/>
                            <p className="text-xs text-gray-400">{t('qanoonai:noHistory')}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {sessions.filter(s => !s.isIncognito).map(s => (
                                <button 
                                    key={s.id}
                                    onClick={() => { setCurrentSessionId(s.id); setCurrentProjectId(s.projectId || null); setShowMobileSidebar(false); }}
                                    className={`w-full text-left rtl:text-right px-3 py-3 rounded-xl text-sm flex items-center justify-between group transition-all duration-200 ${
                                        currentSessionId === s.id 
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm border border-gray-100 dark:border-gray-700' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    <span className="flex items-center gap-3 truncate max-w-[85%]">
                                        <MessageSquare size={16} className={currentSessionId === s.id ? 'text-blue-500 fill-blue-500/20' : 'opacity-70'}/> 
                                        <span className="truncate">{s.title}</span>
                                    </span>
                                    <div onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                        <Trash2 size={14}/>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <button onClick={() => setCurrentView('dashboard')} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:shadow-sm rounded-xl text-sm font-medium transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                    <ArrowLeft size={18} className="rtl:rotate-180"/> {t('qanoonai:back')}
                </button>
            </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
            
            {/* Top Toolbar */}
            <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6 z-10 shadow-sm">
                <div className="flex items-center gap-2 md:gap-3 overflow-visible">
                    {/* Jurisdiction Selector */}
                    <CustomDropdown 
                        label={t('qanoonai:jurisdiction')} 
                        options={countryOptions} 
                        selected={selectedCountry} 
                        onSelect={setSelectedCountry}
                        isOpen={isCountryOpen}
                        setIsOpen={setIsCountryOpen}
                        icon={Globe}
                    />

                    {/* Tone Selector */}
                    <CustomDropdown 
                        label={t('qanoonai:tone')} 
                        options={toneOptions} 
                        selected={selectedTone} 
                        onSelect={(val: any) => setSelectedTone(val as AITone)}
                        isOpen={isToneOpen}
                        setIsOpen={setIsToneOpen}
                        icon={Settings}
                    />

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0"></div>

                    {/* New Buttons */}
                    <button 
                        onClick={() => setIsIncognito(!isIncognito)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border flex-shrink-0 ${isIncognito ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        title={t('qanoonai:incognito')}
                    >
                        {isIncognito ? <VenetianMask size={16}/> : <EyeOff size={16}/>} 
                        <span className="hidden sm:inline">{t('qanoonai:incognito')}</span>
                    </button>
                    <button 
                        onClick={() => setUseWebSearch(!useWebSearch)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border flex-shrink-0 ${useWebSearch ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        title={t('qanoonai:webSearch')}
                    >
                        <Globe size={16}/> 
                        <span className="hidden sm:inline">{t('qanoonai:webSearch')}</span>
                    </button>
                </div>

                <button onClick={() => setCurrentView('dashboard')} className="hidden md:flex items-center gap-1 text-gray-500 hover:text-red-500 transition flex-shrink-0 ml-2 rtl:mr-2 rtl:ml-0">
                    <X size={20} /> <span className="text-sm font-medium">{t('qanoonai:close')}</span>
                </button>
            </header>

            {/* Project Context Banner */}
            {activeProject && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/50 px-6 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <FolderOpen size={14} />
                        <span className="font-bold">{t('qanoonai:projectContext')} {activeProject.name}</span>
                        <span className="hidden md:inline opacity-75">- {t('qanoonai:projectHint')}</span>
                    </div>
                    <button onClick={() => setCurrentProjectId(null)} className="hover:text-red-500"><X size={14}/></button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                {!currentSessionId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                            <Scale size={48} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('qanoonai:welcome')}</h2>
                        <p className="text-gray-500 max-w-md">{t('qanoonai:welcomeDesc')}</p>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-3xl mx-auto">
                        {activeSession?.messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? (activeSession.isIncognito ? 'bg-gray-800 text-white' : 'bg-gray-200 dark:bg-gray-700') : 'bg-blue-600 text-white'}`}>
                                    {msg.role === 'user' ? (activeSession.isIncognito ? <VenetianMask size={16}/> : <User size={16}/>) : <Scale size={16}/>}
                                </div>
                                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {msg.attachment && (
                                        <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs">
                                            <FileImage size={14} className="text-blue-500"/> {msg.attachment.name}
                                        </div>
                                    )}
                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? (activeSession.isIncognito ? 'bg-gray-800 text-white rounded-tr-none' : 'bg-blue-600 text-white rounded-tr-none')
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                                    }`}>
                                        <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4 animate-fade-in">
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-1"><Scale size={16}/></div>
                                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-none flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                    <span className="text-xs text-gray-400 ml-2">{t('qanoonai:analyzing')}</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="max-w-3xl mx-auto">
                    
                    {attachment && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 w-fit animate-scale-in">
                            <FileImage size={14}/> {attachment.name}
                            <button onClick={() => setAttachment(null)} className="ml-2 hover:text-red-500"><X size={14}/></button>
                        </div>
                    )}
                    
                    <div className={`relative flex items-end gap-2 bg-gray-100 dark:bg-gray-700/50 rounded-2xl p-2 border transition-all shadow-inner ${isIncognito ? 'border-gray-500 dark:border-gray-500' : 'border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-gray-800'}`}>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 transition rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700" title={t('qanoonai:attachFile')}>
                            <Paperclip size={20} />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleChatFileUpload} accept="*" />
                        
                        <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder={t('qanoonai:typeMsg')}
                            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white resize-none py-2 max-h-32 custom-scrollbar"
                            rows={1}
                        />
                        
                        <button 
                            onClick={handleSendMessage}
                            disabled={isLoading || (!input.trim() && !attachment)}
                            className={`p-2 text-white rounded-xl transition disabled:opacity-50 disabled:bg-gray-400 shadow-md ${isIncognito ? 'bg-gray-800 hover:bg-gray-900' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            <Send size={20} className="rtl:rotate-180"/>
                        </button>
                    </div>
                </div>
            </div>
        </main>

        {/* Create Project Modal */}
        {showProjectModal && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('qanoonai:createProject')}</h3>
                        <button onClick={() => setShowProjectModal(false)}><X size={20} className="text-gray-400"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('qanoonai:projectName')}</label>
                            <input 
                                type="text" 
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('qanoonai:uploadKnowledge')}</label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer" onClick={() => projectFileInputRef.current?.click()}>
                                <input type="file" multiple ref={projectFileInputRef} className="hidden" onChange={handleProjectFileUpload} accept=".pdf,.txt,.docx" />
                                <FolderOpen size={32} className="mx-auto text-blue-500 mb-2 opacity-50"/>
                                <span className="text-sm text-gray-500 font-medium">{t('qanoonai:files')}</span>
                            </div>
                            {newProjectFiles.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {newProjectFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            <FileText size={12}/> {f.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-900/50">
                        <button onClick={() => setShowProjectModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">{t('qanoonai:cancel')}</button>
                        <button onClick={saveNewProject} disabled={!newProjectName} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{t('qanoonai:create')}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
