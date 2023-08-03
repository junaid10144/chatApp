const Avatar = ({ userId, username, online, photoURL }) => {
  const colors = [
    "bg-teal-200",
    "bg-red-200",
    "bg-green-200",
    "bg-purple-200",
    "bg-blue-200",
    "bg-yellow-200",
    "bg-pink-200",
  ]
  const userIdBase10 = parseInt(userId, 16)
  const colorIndex = userIdBase10 % colors.length
  const color = colors[colorIndex]
  // if (photoURL === "null") {
  //   console.log(
  //     "--------------------------found--------------------------------------(`null`) blow is detail"
  //   )
  //   console.log(userId, username, online, photoURL)
  // }
  return (
    <div
      className={
        "w-12 h-12 relative rounded-full flex items-center max-md:w-8 max-md:h-8 " +
        color
      }
    >
      {photoURL === "null" || photoURL === null ? (
        <div className="w-full text-center opacity-70 text-lg font-bold font-serif max-md:text-sm">
          {username[0]}
        </div>
      ) : (
        <img
          src={`${import.meta.env.VITE_API_BASE_URL}/dp/${photoURL}`}
          alt=""
          className="w-12 h-12 rounded-full object-cover max-md:w-8 max-md:h-8"
        />
      )}
      {online && (
        <div className="absolute w-4 h-4 max-md:w-2 max-md:h-2 bg-green-600 bottom-0 right-0 rounded-full border border-white shadow-lg shadow-black"></div>
      )}
      {!online && (
        <div className="absolute w-4 h-4 max-md:w-2 max-md:h-2 bg-gray-400 bottom-0 right-0 rounded-full border border-white shadow-lg shadow-black"></div>
      )}
    </div>
  )
}

export default Avatar
