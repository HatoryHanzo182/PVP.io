function SaveGamerSession() {
  var nickname = document.getElementById("input").value;
  const errorElement = document.getElementById("error-input");

  if (InputValidityData(nickname)) window.location.href = "/game";
  else {
    errorElement.innerHTML = "Invalid input data";
  }
}

function InputValidityData(nick) {
  var regex = /^[A-Za-z0-9]{1,15}$/;
  return regex.test(nick);
}

function GenerateClientId() {
  return Math.random().toString(36).substring(2, 10);
}

// function toggleChat() {
//   var chatBox = document.getElementById("chat-box");
//   chatBox.style.display = chatBox.style.display === "none" ? "block" : "none";
// }

// function sendMessage() {
//   var messageInput = document.getElementById("message");
//   var messageText = messageInput.value;

//   if (messageText.trim() === "") return;

//   var chatContent = document.querySelector(".chat-content");
//   var messageElement = document.createElement("div");
//   var userNickname = document.createElement("div");
//   var messageContent = document.createElement("div");

//   userNickname.textContent = "You:"; // Change this dynamically based on the user
//   userNickname.classList.add("user-nickname");
//   messageElement.classList.add("message");

//   messageContent.textContent = messageText;
//   messageContent.classList.add("user-message");

//   messageElement.appendChild(userNickname);
//   messageElement.appendChild(messageContent);

//   chatContent.appendChild(messageElement);

//   messageInput.value = "";
// }

function toggleChat() {
  var chatBox = document.getElementById("chat-box");
  chatBox.style.display = chatBox.style.display === "none" ? "block" : "none";
}

function sendMessage() {
  var messageInput = document.getElementById("message");
  var messageText = messageInput.value;

  if (messageText.trim() === "") return;

  var chatContent = document.querySelector(".chat-content");

  // // Get the user's nickname from an input field or another source
  // var userNickname = document.getElementById("user-nickname").value || "You";

  var messageElement = document.createElement("div");
  messageElement.classList.add("message");

  var userNicknameElement = document.createElement("span");
  userNicknameElement.classList.add("user-nickname");
  userNicknameElement.textContent = userNickname + ":";

  var messageTextElement = document.createElement("span");
  messageTextElement.classList.add("message-text");
  messageTextElement.textContent = messageText;

  messageElement.appendChild(userNicknameElement);
  messageElement.appendChild(messageTextElement);
  chatContent.appendChild(messageElement);

  messageInput.value = "";
}
