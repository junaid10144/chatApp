import { useContext, useState } from "react"
import axios from "axios"
import { UserContext } from "./UserContext"
import Logo from "./Logo"

const RegisterAndLoginForm = () => {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [photo, setPhoto] = useState(null)
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("login")
  const { setId } = useContext(UserContext)

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (isLoginOrRegister === "register") {
      console.log("make request")
      const formData = new FormData()
      formData.append("profilePhoto", photo)
      formData.append("username", username)
      formData.append("password", password)
      formData.append("email", email)
      const { data } = await axios.post("register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      setId(data.id)
    } else {
      const { data } = await axios.post("login", { email, password })
      setId(data.id)
    }
  }

  return (
    <div className="bg-blue-50 h-screen flex items-center flex-col justify-center gap-10">
      <div className="max-md:w-screen max-md:pl-12">
        <Logo />
      </div>
      <form
        className="w-64 mx-auto mb-12"
        onSubmit={handleSubmit}
        encType="multipart/form-data"
      >
        {isLoginOrRegister === "register" && (
          <div>
            <input
              type="text"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              placeholder="username"
              className="block w-full rounded-sm p-2 mb-2 border"
            />
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="email"
              className="block w-full rounded-sm p-2 mb-2 border "
            />
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="password"
              className="block w-full rounded-sm p-2 mb-2 border"
            />
            <label
              className="p-2 text-[#8da4f1] cursor-pointer flex items-center gap-3 "
              title="upload your profile picture"
            >
              <input
                type="file"
                className="hidden"
                onChange={(ev) => setPhoto(ev.target.files[0])}
              />
              <img src="/addAvatar.png" className="w-8" />
              Add an avatar
            </label>
            <button
              className="bg-blue-500 text-white block w-full rounded-sm p-2 mt-2"
              type="submit"
            >
              Register
            </button>
            <div className="text-center mt-2">
              Already a member?{" "}
              <button
                className="ml-1"
                onClick={() => {
                  setIsLoginOrRegister("login")
                }}
              >
                Login here
              </button>{" "}
            </div>
          </div>
        )}
        {isLoginOrRegister === "login" && (
          <div>
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="email"
              className="block w-full rounded-sm p-2 mb-2 border"
            />
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="password"
              className="block w-full rounded-sm p-2 mb-2 border"
            />
            <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
              Login
            </button>
            <div className="text-center mt-2">
              Don't have an account?{" "}
              <button
                className="ml-1"
                onClick={() => {
                  setIsLoginOrRegister("register")
                }}
              >
                Register
              </button>{" "}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default RegisterAndLoginForm
