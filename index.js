const express = require("express")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const bcrypt = require("bcryptjs")
require("dotenv").config()
const jwt = require("jsonwebtoken")
const cors = require("cors")
const multer = require("multer")
const User = require("./models/User")
const Message = require("./models/Message")
const ws = require("ws")
const fs = require("fs")

mongoose.set("strictQuery", true)
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("connected to db!"))
  .catch((err) => {
    if (err) throw err
  })
const jwtSecret = process.env.JWT_SECRET
const bcryptSalt = bcrypt.genSaltSync(10)

const app = express()
app.use("/api/uploads", express.static(__dirname + "/uploads"))
app.use("/api/dp", express.static(__dirname + "/dp"))

app.use(cookieParser())
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
)

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "dp/") // The directory where the profile pictures will be stored
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = file.originalname.split(".").pop()
    cb(null, uniqueSuffix + "." + ext)
  },
})
const upload = multer({ storage: storage })

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err
        //const {id,username} = userData
        resolve(userData)
      })
    } else {
      reject("no token")
    }
  })
}

app.get("/api/messages/:userId", async (req, res) => {
  const { userId } = req.params
  const userData = await getUserDataFromRequest(req)
  const ourUserId = userData.userId
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 })
  res.json(messages)
})

app.get("/api/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1, photoURL: 1 })
  res.json(users)
})

app.get("/api/profile", (req, res) => {
  const token = req.cookies?.token
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err
      console.log("userData =>", userData)
      res.json(userData)
    })
  } else {
    res.status(401).json("no token")
  }
})

app.post("/api/login", express.json(), async (req, res) => {
  const { password, email } = req.body
  const foundUser = await User.findOne({ email })
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password)
    if (passOk) {
      jwt.sign(
        {
          userId: foundUser._id,
          username: foundUser.username,
          photoURL: foundUser.photoURL,
        },
        jwtSecret,
        {},
        (err, token) => {
          res.cookie("token", token, { sameSite: "none", secure: true }).json({
            id: foundUser._id,
          })
        }
      )
    }
  }
})

app.post("/api/logout", (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).json("ok")
})

// Route to handle the image upload
app.post(
  "/api/upload-profile-image",
  express.json(),
  upload.single("profileImage"),
  async (req, res) => {
    const profilePhoto = req.file
    const { remove } = req.body
    const userData = await getUserDataFromRequest(req)
    const photoURL = profilePhoto && !remove ? profilePhoto.filename : null

    if (remove && userData.photoURL) {
      // If the 'remove' field is true and the user has a profile photo,
      // delete the profile photo file from the 'dp' folder
      fs.unlink(__dirname + "/dp/" + userData.photoURL, (err) => {
        if (err) {
          console.error("Error deleting profile photo file:", err)
        } else {
          console.log("Profile photo file deleted successfully")
        }
      })
    }
    try {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userData.userId }, // Assuming you have a userId property on the WebSocket connection object
        { photoURL: photoURL },
        { new: true } // This option returns the updated user object
      )
      jwt.sign(
        {
          userId: updatedUser._id,
          username: updatedUser.username,
          photoURL: photoURL,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(201)

          // If the profile photo is removed, send a 204 No Content status code
          if (remove) {
            return res.end()
          } else {
            // If a new photo is uploaded, send the photoURL in the JSON response
            return res.json(photoURL)
          }
        }
      )
    } catch (err) {
      if (err) throw err
      res.status(500).json("error")
    }
  }
)

app.post("/api/register", upload.single("profilePhoto"), async (req, res) => {
  const { username, password, email } = req.body
  const profilePhoto = req.file
  console.log(username, password, email, profilePhoto)
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
    const createdUser = await User.create({
      username,
      email,
      password: hashedPassword,
      photoURL: profilePhoto ? profilePhoto.filename : null,
    })
    jwt.sign(
      {
        userId: createdUser._id,
        username,
        photoURL: profilePhoto ? profilePhoto.filename : null,
      },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          })
      }
    )
  } catch (err) {
    if (err) throw err
    res.status(500).json("error")
  }
})

const server = app.listen(process.env.PORT, () => {
  console.log("running server at", process.env.PORT)
})

//----------------- creating web socket server in this same file ------------------------

const webSocketServer = new ws.WebSocketServer({ server })

webSocketServer.on("connection", (connection, req) => {
  function notifyAboutOnlinePeople() {
    ;[...webSocketServer.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...webSocketServer.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
            photoURL: c.photoURL,
          })),
        })
      )
    })
  }

  connection.isAlive = true

  connection.timer = setInterval(() => {
    connection.ping()
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false
      clearInterval
      connection.terminate(connection.timer)
      notifyAboutOnlinePeople()
      //console.log("dead")
    }, 1000)
  }, 5000)

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer)
  })

  //  read usename and id from the cookie for this connection
  const cookies = req.headers.cookie //console.log(req.headers);
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="))
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1]
      if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
          if (err) throw err
          const { userId, username, photoURL } = userData
          connection.userId = userId
          connection.username = username
          connection.photoURL = photoURL
        })
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString())
    const { recipient, text, file } = messageData
    let filename = null
    if (file) {
      const parts = file.name.split(".")
      const ext = parts[parts.length - 1]
      filename = Date.now() + "." + ext
      const path = __dirname + "/uploads/" + filename
      const bufferData = new Buffer(file.data.split(",")[1], "base64")
      fs.writeFile(path, bufferData, () => {
        console.log("file having size" + file.data.length + " saved at " + path)
      })
    }
    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? filename : null,
      })
      ;[...webSocketServer.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file: file ? filename : null,
              _id: messageDoc._id,
            })
          )
        )
    }
  })

  //-------------Notify everyone about online people (when someone connect)
  notifyAboutOnlinePeople()

  //console.log([...webSocketServer.clients].map(c=>c.username)); //webSocketServer.clients object hai isy array me convert krny k liye hum ny aisa kiya
})
