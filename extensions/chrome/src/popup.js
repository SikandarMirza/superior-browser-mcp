// Superior Browser MCP - Popup Script

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const connectionInfo = document.getElementById('connectionInfo');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');

function updateStatus(status) {
  statusDot.className = 'status-dot';
  
  switch (status) {
    case 'connected':
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected to MCP Server';
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      break;
    case 'connecting':
      statusDot.classList.add('connecting');
      statusText.textContent = 'Connecting...';
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      break;
    case 'disconnected':
      statusDot.classList.add('disconnected');
      statusText.textContent = 'Disconnected';
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      break;
  }
}

connectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'connect' }, (response) => {
    if (response && response.status === 'connecting') {
      updateStatus('connecting');
    }
  });
});

disconnectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
    if (response && response.status === 'disconnected') {
      updateStatus('disconnected');
    }
  });
});

// Check initial status
chrome.runtime.sendMessage({ action: 'status' }, (response) => {
  if (response) {
    updateStatus(response.connected ? 'connected' : 'disconnected');
    if (response.url) {
      connectionInfo.textContent = response.url;
    }
  } else {
    updateStatus('disconnected');
  }
});
