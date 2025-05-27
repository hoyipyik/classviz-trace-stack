import { callTreeParser } from "../../../utils/process/callTreeParser.js";
import { xmlFileReader } from "../../../utils/process/xmlFileReader.js";

import { TraceStackApp } from "../../../TraceStackApp.js";
import { relayoutWithBottomSpace } from "../widgets/ResizeManager.js";

let currentTraceStackApp = null;
window.currentTraceStackApp = currentTraceStackApp; // Expose for debugging

export const traceLoader = () => {
    document.addEventListener('DOMContentLoaded', function () {
        console.log('Trace file loader initialized');
        const traceButton = document.getElementById('trace-btn');
        const fileInput = document.getElementById('call-tree-selector');

        // Add event listener to the button
        traceButton.addEventListener('click', () => {
            fileInput.click(); // Trigger the file input click
            console.log('Button clicked');
        });

        // Add event listener to the file input
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                // 檢查是否已經有實例存在
                if (currentTraceStackApp) {
                    console.log('Previous instance detected, refreshing page for clean state...');
                    
                    // 將文件信息存儲到 sessionStorage，這樣刷新後還能訪問
                    const fileReader = new FileReader();
                    fileReader.onload = function(e) {
                        sessionStorage.setItem('pendingTraceFile', e.target.result);
                        sessionStorage.setItem('pendingTraceFileName', file.name);
                        
                        // 強制刷新頁面
                        window.location.reload();
                    };
                    fileReader.readAsText(file);
                    return;
                }

                // 第一次加載或者頁面刷新後的加載
                try {
                    const parsedXml = await xmlFileReader(file);
                    console.log("context", window.context);
                    const { cascadeTree, idRangeByThreadMap } = callTreeParser(parsedXml);
                    
                    currentTraceStackApp = new TraceStackApp(cascadeTree, idRangeByThreadMap);
                    window.currentTraceStackApp = currentTraceStackApp;
                    document.getElementById('mainContent').style.display = 'block';
                    
                    relayoutWithBottomSpace();
                    
                    // 上傳成功後觸發自動操作
                    setTimeout(() => {
                        autoPreOperation();
                    }, 500); // 延遲 500ms 以確保界面渲染完成
                    
                    console.log('TraceStackApp loaded successfully');
                } catch (error) {
                    console.error('Error loading trace file:', error);
                    alert('Error loading trace file. Please try again.');
                }
            }
        });

        // 檢查是否有待處理的文件（頁面刷新後）
        checkForPendingFile();
    });

    function autoPreOperation() {
        const btnElement = document.getElementById('calls');
        if (btnElement) {
            btnElement.click(); // 自動點擊 "calls" 按鈕
            console.log('Auto pre-operation: clicked calls button');
        } else {
            console.warn('calls button not found for auto pre-operation');
        }
        const tabeElement = document.getElementById('trace-tab');
        if (tabeElement) {
            tabeElement.click(); // 自動點擊 "trace" 標籤
            console.log('Auto pre-operation: clicked trace tab');
        } else {
            console.warn('trace tab not found for auto pre-operation');
        }
    }

    // 檢查 sessionStorage 中是否有待處理的文件
    async function checkForPendingFile() {
        const pendingFileContent = sessionStorage.getItem('pendingTraceFile');
        const pendingFileName = sessionStorage.getItem('pendingTraceFileName');
        
        if (pendingFileContent && pendingFileName) {
            console.log(`Found pending file: ${pendingFileName}, waiting for cy to be mounted...`);
            
            // 等待 cy 被掛載
            await waitForCytoscape();
            
            try {
                console.log(`Loading pending file: ${pendingFileName}`);
                
                // 清理 sessionStorage
                sessionStorage.removeItem('pendingTraceFile');
                sessionStorage.removeItem('pendingTraceFileName');
                
                // 創建 File 對象（模擬文件上傳）
                const blob = new Blob([pendingFileContent], { type: 'text/xml' });
                const file = new File([blob], pendingFileName, { type: 'text/xml' });
                
                // 處理文件
                const parsedXml = await xmlFileReader(file);
                console.log("context", window.context);
                const { cascadeTree, idRangeByThreadMap } = callTreeParser(parsedXml);
                
                currentTraceStackApp = new TraceStackApp(cascadeTree, idRangeByThreadMap);
                window.currentTraceStackApp = currentTraceStackApp;
                document.getElementById('mainContent').style.display = 'block';
                
                relayoutWithBottomSpace();
                
                // 頁面刷新後重新加載成功，也觸發自動操作
                setTimeout(() => {
                    autoPreOperation();
                }, 100); // 延遲 500ms 以確保界面渲染完成
                
                console.log('Pending TraceStackApp loaded successfully after refresh');
            } catch (error) {
                console.error('Error loading pending trace file:', error);
                alert('Error loading trace file after refresh. Please try again.');
                
                // 如果加載失敗，清理 sessionStorage
                sessionStorage.removeItem('pendingTraceFile');
                sessionStorage.removeItem('pendingTraceFileName');
            }
        }
    }

    // 等待 Cytoscape 實例被掛載
    async function waitForCytoscape() {
        const maxWaitTime = 30000; // 最大等待 10 秒
        const checkInterval = 100; // 每 100ms 檢查一次
        let elapsed = 0;
        
        return new Promise((resolve, reject) => {
            const checkCy = () => {
                if (window.cy && typeof window.cy.add === 'function') {
                    console.log(`Cytoscape instance found after ${elapsed}ms`);
                    resolve();
                } else if (elapsed >= maxWaitTime) {
                    console.warn('Timeout waiting for Cytoscape instance');
                    reject(new Error('Timeout waiting for Cytoscape'));
                } else {
                    elapsed += checkInterval;
                    setTimeout(checkCy, checkInterval);
                }
            };
            
            checkCy();
        });
    }
}