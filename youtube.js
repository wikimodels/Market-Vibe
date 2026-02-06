// ==UserScript==
// @name         YouTube Transcript Bulk Extractor - Final
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Массовое извлечение транскриптов с YouTube
// @match        https://www.youtube.com/watch?v=*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      youtube.com
// ==/UserScript==

(function() {
    'use strict';
    
    // ВСТАВЬТЕ СЮДА ВСЕ ВАШИ URL
    const VIDEO_URLS = [
        'https://www.youtube.com/watch?v=TwRPGmBKIY0&pp=ygUYY29udGV4dDcgbWNwIGFudGlncmF2aXR5',
        'https://www.youtube.com/watch?v=Tk4y63IsA4s&pp=ygUYY29udGV4dDcgbWNwIGFudGlncmF2aXR5',
        'https://www.youtube.com/watch?v=323l56VqJQw&pp=ygUYY29udGV4dDcgbWNwIGFudGlncmF2aXR5',
        // ... добавьте все остальные URL из вашего списка
    ];
    
    // Извлекаем video ID из URL
    function extractVideoId(url) {
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }
    
    const VIDEO_LIST = VIDEO_URLS.map(url => extractVideoId(url)).filter(id => id !== null);
    
    let currentVideoId = new URLSearchParams(window.location.search).get('v');
    let isProcessing = false;
    
    // Создаём панель управления
    function createControlPanel() {
        if (document.getElementById('transcript-extractor-panel')) {
            updatePanel();
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'transcript-extractor-panel';
        panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 320px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #ff6b00;
            border-radius: 12px;
            padding: 20px;
            z-index: 99999;
            font-family: 'Roboto', Arial, sans-serif;
            color: white;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;
        
        document.body.appendChild(panel);
        updatePanel();
        
        document.getElementById('start-extraction').addEventListener('click', () => extractTranscript(false));
        document.getElementById('auto-mode').addEventListener('click', startAutoMode);
        document.getElementById('export-all').addEventListener('click', exportAllTranscripts);
        document.getElementById('reset-progress').addEventListener('click', resetProgress);
        
        // Эффекты при наведении
        const buttons = panel.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 4px 12px rgba(255,107,0,0.4)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = 'none';
            });
        });
    }
    
    function updatePanel() {
        const panel = document.getElementById('transcript-extractor-panel');
        if (!panel) return;
        
        const processed = GM_getValue('processed', []);
        const failed = GM_getValue('failed', []);
        const currentIndex = VIDEO_LIST.indexOf(currentVideoId);
        const total = VIDEO_LIST.length;
        const progress = total > 0 ? ((processed.length / total) * 100).toFixed(1) : 0;
        
        panel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ff6b00; font-size: 18px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px;">
                📝 Transcript Extractor
            </h3>
            <div style="margin-bottom: 15px; line-height: 1.6;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>Видео:</strong>
                    <span>${currentIndex >= 0 ? currentIndex + 1 : '?'} / ${total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>✅ Обработано:</strong>
                    <span style="color: #4CAF50;">${processed.length}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>❌ Ошибок:</strong>
                    <span style="color: #f44336;">${failed.length}</span>
                </div>
                <div style="margin-top: 10px;">
                    <div style="background: #333; border-radius: 10px; height: 20px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #ff6b00, #ff9800); width: ${progress}%; height: 100%; transition: width 0.3s;"></div>
                    </div>
                    <div style="text-align: center; margin-top: 5px; font-size: 12px;">${progress}%</div>
                </div>
                <div style="margin-top: 10px; font-size: 11px; color: #888; word-break: break-all;">
                    <strong>ID:</strong> ${currentVideoId}
                </div>
            </div>
            <button id="start-extraction" style="width: 100%; padding: 12px; margin-bottom: 8px; background: linear-gradient(135deg, #ff6b00, #ff9800); border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
                ▶️ Извлечь транскрипт
            </button>
            <button id="auto-mode" style="width: 100%; padding: 12px; margin-bottom: 8px; background: linear-gradient(135deg, #2196F3, #03A9F4); border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
                🚀 Авто-режим
            </button>
            <button id="export-all" style="width: 100%; padding: 12px; margin-bottom: 8px; background: linear-gradient(135deg, #4CAF50, #8BC34A); border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
                💾 Экспорт (${processed.length})
            </button>
            <button id="reset-progress" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #f44336, #E91E63); border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">
                🗑️ Сбросить
            </button>
            <div id="status-message" style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 12px; color: #aaa; min-height: 40px; display: flex; align-items: center; justify-content: center; text-align: center;"></div>
        `;
    }
    
    function setStatus(message, color = '#aaa') {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.innerHTML = message;
            statusEl.style.color = color;
        }
    }
    
    // Извлечение транскрипта из страницы
    async function extractTranscript(autoMode = false) {
        if (isProcessing) return;
        isProcessing = true;
        
        setStatus('🔍 Ищу транскрипт...', 'yellow');
        
        try {
            // Получаем данные из ytInitialPlayerResponse
            const scriptTags = document.querySelectorAll('script');
            let captionsData = null;
            
            for (const script of scriptTags) {
                const content = script.textContent;
                if (content.includes('ytInitialPlayerResponse')) {
                    const match = content.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
                    if (match) {
                        try {
                            const playerResponse = JSON.parse(match[1]);
                            captionsData = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                            if (captionsData && captionsData.length > 0) break;
                        } catch (e) {
                            console.log('Parse error:', e);
                        }
                    }
                }
            }
            
            if (!captionsData || captionsData.length === 0) {
                throw new Error('Транскрипт недоступен');
            }
            
            // Берём первый доступный транскрипт
            const transcriptUrl = captionsData[0].baseUrl;
            
            // Загружаем транскрипт
            GM_xmlhttpRequest({
                method: 'GET',
                url: transcriptUrl,
                onload: function(response) {
                    try {
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(response.responseText, 'text/xml');
                        const textElements = xmlDoc.querySelectorAll('text');
                        
                        let transcriptText = '';
                        textElements.forEach(el => {
                            const start = parseFloat(el.getAttribute('start')).toFixed(0);
                            const text = el.textContent.replace(/\n/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
                            if (text) {
                                transcriptText += `{ts:${start}} ${text}\n`;
                            }
                        });
                        
                        if (transcriptText.length > 50) {
                            saveTranscript(transcriptText, autoMode);
                        } else {
                            throw new Error('Транскрипт пустой');
                        }
                    } catch (e) {
                        console.error('Error parsing transcript:', e);
                        markAsFailed();
                        isProcessing = false;
                        if (autoMode) setTimeout(() => goToNextVideo(), 2000);
                    }
                },
                onerror: function(error) {
                    console.error('XHR error:', error);
                    markAsFailed();
                    isProcessing = false;
                    if (autoMode) setTimeout(() => goToNextVideo(), 2000);
                }
            });
            
        } catch (error) {
            console.error('Ошибка:', error);
            markAsFailed();
            isProcessing = false;
            if (autoMode) setTimeout(() => goToNextVideo(), 2000);
        }
    }
    
    function saveTranscript(text, autoMode = false) {
        const videoTitle = document.querySelector('h1.ytd-watch-metadata, #title h1, yt-formatted-string.ytd-watch-metadata')?.textContent.trim() || 'Unknown';
        
        const data = {
            videoId: currentVideoId,
            title: videoTitle,
            transcript: text.trim(),
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        GM_setValue(`transcript_${currentVideoId}`, JSON.stringify(data));
        
        const processed = GM_getValue('processed', []);
        if (!processed.includes(currentVideoId)) {
            processed.push(currentVideoId);
            GM_setValue('processed', processed);
        }
        
        const charCount = text.length;
        const wordCount = text.split(/\s+/).length;
        setStatus(`✅ Сохранено!<br>${charCount} символов, ~${wordCount} слов`, '#00ff00');
        isProcessing = false;
        
        updatePanel();
        
        if (autoMode) {
            setTimeout(() => goToNextVideo(), 2000);
        }
    }
    
    function markAsFailed() {
        const failed = GM_getValue('failed', []);
        if (!failed.includes(currentVideoId)) {
            failed.push(currentVideoId);
            GM_setValue('failed', failed);
        }
        setStatus('❌ Транскрипт не найден', 'red');
        updatePanel();
    }
    
    function startAutoMode() {
        if (confirm('Запустить автоматический режим?\n\nСкрипт будет:\n1. Извлекать транскрипт текущего видео\n2. Автоматически переходить к следующему\n3. Повторять до конца списка')) {
            extractTranscript(true);
        }
    }
    
    function goToNextVideo() {
        const currentIndex = VIDEO_LIST.indexOf(currentVideoId);
        if (currentIndex < VIDEO_LIST.length - 1) {
            const nextId = VIDEO_LIST[currentIndex + 1];
            const nextUrl = VIDEO_URLS.find(url => url.includes(nextId));
            setStatus(`⏭️ Переход к следующему...<br>(${currentIndex + 2}/${VIDEO_LIST.length})`, 'yellow');
            setTimeout(() => {
                window.location.href = nextUrl || `https://www.youtube.com/watch?v=${nextId}`;
            }, 1000);
        } else {
            setStatus('🎉 ВСЕ ВИДЕО ОБРАБОТАНЫ!<br>Нажмите "Экспорт"', '#00ff00');
        }
    }
    
    function exportAllTranscripts() {
        const processed = GM_getValue('processed', []);
        const failed = GM_getValue('failed', []);
        
        if (processed.length === 0) {
            alert('❌ Нет сохранённых транскриптов');
            return;
        }
        
        let allText = `ТРАНСКРИПТЫ YOUTUBE ВИДЕО (ANTIGRAVITY)\n`;
        allText += `Всего обработано: ${processed.length}\n`;
        allText += `Ошибок: ${failed.length}\n`;
