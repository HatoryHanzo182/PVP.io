const socket = io();

function SaveGamerSession() {
  var nickname = document.getElementById("input").value;
  const error_element = document.getElementById("error-input");

  if (InputValidityData(nickname)) {
    sessionStorage.setItem("in_session", "true");
    window.location.href = "/game";
  } else error_element.innerHTML = "Invalid input data";
}

function InputValidityData(nick) {
  var regex = /^[A-Za-z0-9]{1,15}$/;
  return regex.test(nick);
}

// == Chat container. ==
function toggleChat() {
  var chatBox = document.getElementById("chat-box");
  chatBox.style.display = chatBox.style.display === "none" ? "block" : "none";
}

function sendMessage() {
  var nickname = document.getElementById("input").value;
  var message_input = document.getElementById("message");
  const error_element = document.getElementById("error-input");
  var message_text = message_input.value;

  if (message_text.trim() === "") return;
  if (!InputValidityData(nickname)) {
    error_element.innerHTML = "To send a message, enter your nickname!";
    return;
  }

  socket.emit("chatMessage", { user: nickname, text: message_text });

  ConstructMessage("user-message", { user: nickname, text: message_text });

  message_input.value = "";
  error_element.innerHTML = "";
}

socket.on("chatMessage", (message) => {
  ConstructMessage("received-message", message);
});

function ConstructMessage(is, message) {
  var chat_content = document.querySelector(".chat-content");
  var message_element = document.createElement("div");

  switch (is) {
    case "user-message": {
      message_element.classList.add("user-message");
      break;
    }
    case "received-message": {
      message_element.classList.add("received-message");
      break;
    }
  }

  var user_nickname_element = document.createElement("span");

  user_nickname_element.classList.add("user-nickname");
  user_nickname_element.textContent = message.user + ":";

  var message_text_element = document.createElement("span");

  message_text_element.classList.add("message-text");
  message_text_element.textContent = message.text;

  message_element.appendChild(user_nickname_element);
  message_element.appendChild(message_text_element);
  chat_content.appendChild(message_element);
}
// ==

// == Setting container. ==
function toggleSettings() {
  var settings = document.getElementById("settings-box");
  settings.style.display = settings.style.display === "none" ? "block" : "none";
}

function SaveDataSeting() {
  ChatHistory();
}

function ChatHistory() {
  const chat_history_checkbox = document.getElementById(
    "chat-history-checkbox"
  );

  if (chat_history_checkbox.checked) {
    ChatHistoryLimit(
      document.getElementById("historychat-number-setting").value
    );
  } else {
    const chatContent = document.querySelector(".chat-content");
    chatContent.innerHTML = "";
  }
}

function ChatHistoryLimit(limit) {
  if (limit == "") return;

  fetch(`/getChatHistory/${limit}`)
    .then((response) => {
      if (response.headers.get("content-encoding") === "gzip")
        return response.arrayBuffer();
      else return response.json();
    })
    .then((data) => {
      if (data instanceof ArrayBuffer) {
        const decompressed_data = new TextDecoder().decode(data);
        const json_data = JSON.parse(decompressed_data);
        const chat_content = document.querySelector(".chat-content");

        chat_content.innerHTML = "";
        json_data.reverse().forEach((message) => {
          ConstructMessage("received-message", {
            user: message.nickname,
            text: message.message,
          });
        });
      } else {
        const chat_content = document.querySelector(".chat-content");
        chat_content.innerHTML = "";

        data.reverse().forEach((message) => {
          ConstructMessage("received-message", {
            user: message.nickname,
            text: message.message,
          });
        });
      }
    })
    .catch((error) => {
      console.error("Error receiving chats:", error.message);
    });
}
// ==
