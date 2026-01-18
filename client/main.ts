// Connect to WebSocket server
const socket = new WebSocket("ws://localhost:8080");

const messagesDiv = document.getElementById("messages")!;
const input = document.getElementById("msgInput") as HTMLInputElement;
const sendBtn = document.getElementById("sendBtn")!;

// Add messages to the page
function addMessage(msg: string) {
  const p = document.createElement("p");
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// WebSocket open
socket.addEventListener("open", () => {
  addMessage("Connected to server!");
});

// WebSocket message received
socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  addMessage(`Server: ${JSON.stringify(msg)}`);
});

// WebSocket closed
socket.addEventListener("close", () => {
  addMessage("Disconnected from server.");
});

// Send message on button click
sendBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;
  socket.send(JSON.stringify({ type: "chat", message: text }));
  addMessage(`You: ${text}`);
  input.value = "";
});
