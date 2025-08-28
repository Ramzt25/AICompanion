import { NextRequest, NextResponse } from 'next/server'

// This endpoint serves the embeddable widget JavaScript
export async function GET(request: NextRequest) {
  const widgetScript = `
(function() {
  'use strict';
  
  // Configuration from script tag attributes
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const config = {
    orgId: scriptTag?.getAttribute('data-org-id') || 'demo-org-id',
    userId: scriptTag?.getAttribute('data-user-id') || 'demo-user',
    authToken: scriptTag?.getAttribute('data-auth-token') || 'demo-token',
    apiBase: scriptTag?.getAttribute('data-api-base') || '${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'}'
  };

  // CSS for the widget
  const widgetCSS = \`
    .ai-companion-widget {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    
    .ai-companion-minimized {
      background: white !important;
      border-radius: 50px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
      border: 1px solid #e5e7eb !important;
      padding: 16px !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
    }
    
    .ai-companion-minimized:hover {
      box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important;
      transform: translateY(-2px) !important;
    }
    
    .ai-companion-chat {
      background: white !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15) !important;
      border: 1px solid #e5e7eb !important;
      width: 320px !important;
      height: 400px !important;
      display: flex !important;
      flex-direction: column !important;
    }
    
    .ai-companion-header {
      padding: 16px !important;
      border-bottom: 1px solid #e5e7eb !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
    }
    
    .ai-companion-content {
      flex: 1 !important;
      padding: 16px !important;
      overflow-y: auto !important;
    }
    
    .ai-companion-input {
      padding: 16px !important;
      border-top: 1px solid #e5e7eb !important;
    }
    
    .ai-companion-input input {
      width: 100% !important;
      padding: 8px 12px !important;
      border: 1px solid #d1d5db !important;
      border-radius: 6px !important;
      outline: none !important;
      font-size: 14px !important;
    }
    
    .ai-companion-input input:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    
    .ai-companion-button {
      background: #3b82f6 !important;
      color: white !important;
      border: none !important;
      padding: 8px 16px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 14px !important;
      margin-top: 8px !important;
    }
    
    .ai-companion-button:hover {
      background: #2563eb !important;
    }
    
    .ai-companion-close {
      background: none !important;
      border: none !important;
      cursor: pointer !important;
      padding: 4px !important;
      color: #6b7280 !important;
    }
    
    .ai-companion-icon {
      width: 24px !important;
      height: 24px !important;
      fill: currentColor !important;
    }
  \`;

  // Widget HTML templates
  const minimizedTemplate = \`
    <div class="ai-companion-minimized" onclick="AICompanionWidget.expand()">
      <svg class="ai-companion-icon" viewBox="0 0 24 24">
        <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
      </svg>
      <span style="margin-left: 8px; font-weight: 500; color: #1f2937;">AI Assistant</span>
    </div>
  \`;

  const chatTemplate = \`
    <div class="ai-companion-chat">
      <div class="ai-companion-header">
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">AI Knowledge Companion</h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Ask questions about your documents</p>
        </div>
        <button class="ai-companion-close" onclick="AICompanionWidget.minimize()">
          <svg class="ai-companion-icon" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="ai-companion-content">
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin-bottom: 16px;">Welcome! How can I help you today?</p>
          <div style="text-align: left; font-size: 12px;">
            <p style="margin-bottom: 8px; font-weight: 500;">Try asking:</p>
            <div style="margin-bottom: 4px; padding: 8px; background: #f9fafb; border-radius: 4px; cursor: pointer;" 
                 onclick="AICompanionWidget.sendMessage('What can you help me with?')">
              "What can you help me with?"
            </div>
            <div style="margin-bottom: 4px; padding: 8px; background: #f9fafb; border-radius: 4px; cursor: pointer;"
                 onclick="AICompanionWidget.sendMessage('Summarize this page')">
              "Summarize this page"
            </div>
          </div>
        </div>
        <div id="ai-companion-messages"></div>
      </div>
      <div class="ai-companion-input">
        <input type="text" id="ai-companion-input" placeholder="Ask a question..." 
               onkeypress="if(event.key==='Enter') AICompanionWidget.sendMessage()">
        <button class="ai-companion-button" onclick="AICompanionWidget.sendMessage()">Send</button>
      </div>
    </div>
  \`;

  // Widget JavaScript logic
  const widgetJS = \`
    window.AICompanionWidget = {
      state: 'minimized',
      container: null,
      
      init: function() {
        // Inject CSS
        const style = document.createElement('style');
        style.textContent = \\\`\${widgetCSS}\\\`;
        document.head.appendChild(style);
        
        // Create widget container
        this.container = document.createElement('div');
        this.container.className = 'ai-companion-widget';
        document.body.appendChild(this.container);
        
        this.render();
        
        // Auto-hide after 30 seconds if minimized
        setTimeout(() => {
          if (this.state === 'minimized') {
            this.container.style.opacity = '0.3';
          }
        }, 30000);
      },
      
      render: function() {
        if (this.state === 'minimized') {
          this.container.innerHTML = \\\`\${minimizedTemplate}\\\`;
        } else {
          this.container.innerHTML = \\\`\${chatTemplate}\\\`;
        }
      },
      
      expand: function() {
        this.state = 'chat';
        this.container.style.opacity = '1';
        this.render();
      },
      
      minimize: function() {
        this.state = 'minimized';
        this.render();
      },
      
      sendMessage: async function(message) {
        const input = document.getElementById('ai-companion-input');
        const text = message || input?.value;
        if (!text) return;
        
        if (input) input.value = '';
        
        // Add message to chat
        const messagesContainer = document.getElementById('ai-companion-messages');
        if (messagesContainer) {
          const messageEl = document.createElement('div');
          messageEl.style.marginBottom = '12px';
          messageEl.innerHTML = \\\`
            <div style="background: #3b82f6; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; max-width: 80%; margin-left: auto;">
              \${text}
            </div>
          \\\`;
          messagesContainer.appendChild(messageEl);
          
          // Show loading indicator
          const loadingEl = document.createElement('div');
          loadingEl.innerHTML = \\\`
            <div id="loading-indicator" style="background: #f3f4f6; color: #6b7280; padding: 8px 12px; border-radius: 8px; max-width: 80%; font-style: italic;">
              AI is thinking...
            </div>
          \\\`;
          messagesContainer.appendChild(loadingEl);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          
          try {
            // Get page content for context
            const pageContent = document.body.innerText;
            
            // Make API call
            const response = await fetch(\\\`\${config.apiBase}/api/widget/chat\\\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: text,
                pageContent: pageContent.substring(0, 2000), // Limit content size
                orgId: config.orgId,
                userId: config.userId
              })
            });
            
            if (!response.ok) {
              throw new Error('API request failed');
            }
            
            const data = await response.json();
            
            // Remove loading indicator
            const loading = document.getElementById('loading-indicator');
            if (loading) loading.parentElement.remove();
            
            // Add AI response
            const responseEl = document.createElement('div');
            responseEl.innerHTML = \\\`
              <div style="background: #f3f4f6; color: #1f2937; padding: 8px 12px; border-radius: 8px; max-width: 80%; white-space: pre-wrap;">
                \${data.message}
              </div>
            \\\`;
            messagesContainer.appendChild(responseEl);
            
          } catch (error) {
            console.error('Widget API error:', error);
            
            // Remove loading indicator
            const loading = document.getElementById('loading-indicator');
            if (loading) loading.parentElement.remove();
            
            // Show error message
            const errorEl = document.createElement('div');
            errorEl.innerHTML = \\\`
              <div style="background: #fef2f2; color: #dc2626; padding: 8px 12px; border-radius: 8px; max-width: 80%; border-left: 3px solid #dc2626;">
                Sorry, I'm having trouble connecting right now. Please try again later.
              </div>
            \\\`;
            messagesContainer.appendChild(errorEl);
          }
          
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        AICompanionWidget.init();
      });
    } else {
      AICompanionWidget.init();
    }
  \`;

  return widgetJS;
})();
`;

  return new NextResponse(widgetScript, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
