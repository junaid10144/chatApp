import { useContext, useEffect, useRef, useState } from "react"
import { UserContext } from "./UserContext"
import { uniqBy } from "lodash"
import axios from "axios"
import Contact from "./Contact"
import Logo from "./Logo"
import ContextMenu from "./ContextMenu"
import PhotoPicker from "./PhotoPicker"

const Chat = () => {
  const [ws, setWs] = useState(null)
  const [onlinePeople, setOnlinePeople] = useState({})
  const [offlinePeople, setOfflinePeople] = useState({})
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [newMessageText, setNewMessageText] = useState("")
  const [messages, setMessages] = useState([])
  const { username, id, setId, setUsername, profile, setProfile } =
    useContext(UserContext)
  const divUnderMessages = useRef()
  const [grabPhoto, setGrabPhoto] = useState(false)
  const [notificationShownForMessage, setNotificationShownForMessage] =
    useState({})

  const [contextMenuCordinates, setContextMenuCordinates] = useState({
    x: 0,
    y: 0,
  })
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false)
  const showContextMenu = (e) => {
    e.preventDefault()
    setContextMenuCordinates({ x: e.pageX, y: e.pageY - 170 })
    setIsContextMenuVisible(true)
  }
  const contextMenuOptions = [
    {
      name: "Upload Photo",
      callback: async () => {
        setGrabPhoto(true)
      },
    },
    {
      name: "Remove Photo",
      callback: async () => {
        try {
          // Send a POST request to remove the profile photo
          await axios.post(
            "/upload-profile-image",
            { remove: true }, // Indicate that we want to remove the profile photo
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          )

          // If the request is successful, set the profile photo to null
          setProfile(null)
        } catch (error) {
          console.error("Error removing profile photo:", error)
        }
      },
    },
  ]

  const photoPickerChange = async (e) => {
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append("profileImage", file) // "profileImage" is the name of the field in the backend to receive the image

    try {
      const response = await axios.post("upload-profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      // After successful upload, update the profile state with the filename or URL received from the backend
      setProfile(response.data) // Assuming the backend responds with the filename of the saved image
    } catch (error) {
      // Handle the error if the upload fails
      console.error("Error uploading profile image:", error)
    }
  }

  useEffect(() => {
    if (grabPhoto) {
      const data = document.getElementById("photo-picker")
      data.click()
      document.body.onfocus = (e) => {
        setTimeout(() => {
          setGrabPhoto(false)
        }, 1000)
      }
    }
  }, [grabPhoto])

  useEffect(() => {
    connectToWs()

    return () => {
      // Clean up WebSocket connection when the component unmounts
      if (ws) {
        ws.removeEventListener("message", handleMessage)
        ws.close()
      }
    }
  }, [selectedUserId])

  function connectToWs() {
    // Check if there is already an active WebSocket connection
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const newWs = new WebSocket(import.meta.env.VITE_WS_URL) //https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
      setWs(newWs)
      newWs.addEventListener("message", handleMessage)
      newWs.addEventListener("close", () => {
        setTimeout(() => {
          //console.log("Disconnected. Trying to reconnect")
          connectToWs() // Try to reconnect on close
        }, 1000)
      })
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data)
      })
    }
  }, [selectedUserId])

  useEffect(() => {
    axios.get("/people").then((res) => {
      const currentUser = res.data.find((p) => p._id === id)
      if (currentUser) {
        setProfile(currentUser.photoURL)
      }
      //console.log("online People=> ", onlinePeople)
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id))
      const offlinePeople = {}
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p
      })
      setOfflinePeople(offlinePeople)
    })
  }, [onlinePeople])

  function showOnlinePeople(peopleArray) {
    const newActivePeople = {}
    peopleArray.forEach(({ userId, username, photoURL }) => {
      if (!newActivePeople[userId]) {
        newActivePeople[userId] = username + "," + photoURL
      }
    })

    // console.log("newActivePeople: => ", newActivePeople)
    // console.log(
    //   "length  of peopleArray or messageData.online => ",
    //   peopleArray.length
    // )
    // console.log(
    //   "length of newActivePeople => ",
    //   Object.keys(newActivePeople).length
    // )
    // function objectsAreEqual(obj1, obj2) {
    //   console.log("comparing")
    //   const obj1Keys = Object.keys(obj1)
    //   const obj2Keys = Object.keys(obj2)

    //   if (obj1Keys.length !== obj2Keys.length) {
    //     return false
    //   }

    //   for (const key of obj1Keys) {
    //     if (obj1[key] !== obj2[key]) {
    //       return false
    //     }
    //   }

    //   return true
    // }

    function objectsAreEqual(obj1, obj2) {
      // console.log(">>>>>>>comparing")
      // console.log(obj1)
      // console.log(obj2)
      const obj1Keys = Object.keys(obj1)
      const obj2Keys = Object.keys(obj2)

      if (obj1Keys.length !== obj2Keys.length) {
        return false
      }

      for (const key of obj1Keys) {
        // console.log(`Key: ${key}`)
        // console.log(`obj1[key]: ${obj1[key]}`)
        // console.log(`obj2[key]: ${obj2[key]}`)

        // Split the values by ',' and compare the second part
        const [value1Name, value1Photo] = obj1[key].split(",")
        const [value2Name, value2Photo] = obj2[key].split(",")

        if (value1Name !== value2Name || value1Photo !== value2Photo) {
          return false
        }
      }

      return true
    }

    // Check if the newPeople is different from the existing onlinePeople state
    if (
      Object.keys(newActivePeople).length > 1 &&
      !objectsAreEqual(newActivePeople, onlinePeople)
      //JSON.stringify(newActivePeople) !== JSON.stringify(onlinePeople) // not working i think because onlinePeople is always empty
    ) {
      // ( peopleArray.length > 1  || peopleArray[0].userId !== id)
      setOnlinePeople(newActivePeople)
    }
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data)
    //console.log({ ev, messageData })
    if ("online" in messageData) {
      showOnlinePeople(messageData.online)
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }])
      } else {
        // Show notification for new message if the sender is not the selected user
        showNotification(messageData.sender, messageData.text)
      }
    }
  }

  function showNotification(sender, text) {
    if (Notification.permission === "granted") {
      if (!notificationShownForMessage[sender]) {
        // Check if a notification for this sender has already been shown
        const notification = new Notification(sender, {
          body: text,
        })

        notification.onclick = () => {
          // Handle notification click, e.g., focus on the chat with the sender
          setSelectedUserId(sender)
          notification.close()
        }

        // Update the state to indicate that the notification has been shown for this sender
        setNotificationShownForMessage((prev) => ({
          ...prev,
          [sender]: true,
        }))

        // Schedule to reset the notification state after a certain period (e.g., 5 seconds)
        setTimeout(() => {
          setNotificationShownForMessage((prev) => ({
            ...prev,
            [sender]: false,
          }))
        }, 5000) // 5 seconds (adjust the time as per your preference)
      }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotification(sender, text)
        }
      })
    }
  }

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null)
      setId(null)
      setUsername(null)
      setProfile(null)
    })
  }

  function sendMessage(ev, file = null) {
    if (ev) ev.preventDefault()
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        file,
      })
    )
    if (file) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data)
      })
    } else {
      setNewMessageText("")
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          _id: Date.now(),
        },
      ])
    }
  }

  function sendFile(ev) {
    const reader = new FileReader()
    reader.readAsDataURL(ev.target.files[0]) //converting into base64 from binary
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      })
    }
  }

  useEffect(() => {
    const div = divUnderMessages.current
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages])

  // const onlinePeopleExclOurUser = { ...onlinePeople }
  // delete onlinePeopleExclOurUser[id] // We don't need to recommend this because it creates undefined holes, but it is necessary to remove the user from the onlinePeople list.
  const onlinePeopleExclOurUser = Object.fromEntries(
    Object.entries(onlinePeople).filter(([key]) => key !== id)
  )
  const messagesWithoutDupes = uniqBy(messages, "_id")

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow max-md:w-screen">
          <div className="flex items-center justify-items-start">
            <Logo />
            {/* <button
              title="Add group"
              className="flex gap-3 bg-blue-100 border rounded-md py-1 px-2 ml-32 font-bold text-gray-500"
              onClick={addgroup}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
              New Group
            </button> */}
          </div>
          {Object.keys(onlinePeopleExclOurUser).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              username={onlinePeopleExclOurUser[userId].split(",")[0]}
              photo={onlinePeopleExclOurUser[userId].split(",")[1]}
              online={true}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
          {Object.keys(offlinePeople).map((userId) => (
            <Contact
              key={userId}
              id={userId}
              username={offlinePeople[userId].username}
              photo={offlinePeople[userId].photoURL}
              online={false}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-around max-md:w-screen max-md:z-10">
          <span className="mr-2 text-sm text-gray-600 flex items-center gap-3 text-blue-900 font-bold text-2xl font-serif">
            <div
              title="Change Profile"
              className="cursor-pointer"
              onClick={(e) => showContextMenu(e)}
              id="context-opener"
            >
              {profile ? (
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL}/dp/${profile}`}
                  className=" w-12 h-12 rounded-full object-cover"
                  alt=""
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {username}
          </span>
          <button
            title="Logout"
            type="button"
            onClick={logout}
            className="text-md bg-blue-100 py-2 px-3 text-gray-500 border font-bold rounded-lg flex gap-3"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm5.03 4.72a.75.75 0 010 1.06l-1.72 1.72h10.94a.75.75 0 010 1.5H10.81l1.72 1.72a.75.75 0 11-1.06 1.06l-3-3a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0z"
                clipRule="evenodd"
              />
            </svg>
            Logout
          </button>
          {isContextMenuVisible && (
            <ContextMenu
              options={contextMenuOptions}
              cordinates={contextMenuCordinates}
              contextMenu={isContextMenuVisible}
              setContextMenu={setIsContextMenuVisible}
            />
          )}
          {grabPhoto && <PhotoPicker onChange={photoPickerChange} />}
        </div>
      </div>
      {/* Main chat area */}
      <div className="flex flex-col bg-blue-100 w-2/3 p-2 border border-l-gray-300 max-md:h-[calc(100%-3.5rem)]">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full flex-grow items-center justify-center font-bold">
              <div className="text-gray-400 flex gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6 rotate-180"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
                Select a person from the Sidebar
              </div>
            </div>
          )}
          {/* Message input section */}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={
                      message.sender === id ? "text-right" : "text-left"
                    }
                  >
                    <div
                      className={
                        "text-left inline-block p-2 my-2 rounded-md text-sm " +
                        (message.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500")
                      }
                    >
                      {message.text}
                      {message.file && (
                        <div>
                          <a
                            target="_blank"
                            className="flex items-center gap-1 border-b "
                            href={
                              axios.defaults.baseURL +
                              "/uploads/" +
                              message.file
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                              />
                            </svg>
                            {message.file}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>

        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              onChange={(ev) => setNewMessageText(ev.target.value)}
              value={newMessageText}
              placeholder="Type your message here"
              className="bg-white flex-grow rounded-sm border p-2 max-md:w-2/3"
            />
            <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200">
              <input type="file" className="hidden" onChange={sendFile} />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 max-md:w-4 max-md:h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                  clipRule="evenodd"
                />
              </svg>
            </label>
            <button
              type="submit"
              className="bg-blue-500 p-2 rounded-sm text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6 max-md:w-4 max-md:h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Chat
