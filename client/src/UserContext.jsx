import axios from "axios"
import { createContext, useEffect, useState } from "react"

export const UserContext = createContext({})

export function UserContextProvider({ children }) {
  const [username, setUsername] = useState(null)
  const [profile, setProfile] = useState(null)
  const [id, setId] = useState(null)
  useEffect(() => {
    axios.get("/profile").then((response) => {
      setId(response.data.userId)
      setUsername(response.data.username)
      setProfile(response.data.photoURL)
    })
  }, [])
  return (
    <UserContext.Provider
      value={{ username, setUsername, id, setId, profile, setProfile }}
    >
      {children}
    </UserContext.Provider>
  )
}
