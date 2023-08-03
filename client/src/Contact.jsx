import Avatar from "./Avatar"

const Contact = ({ id, username, onClick, selected, online, photo = null }) => {
  if (username && username !== "undefined") {
    return (
      <div
        key={id}
        onClick={() => onClick(id)}
        className={
          "border-b border-gray-100 flex items-center gap-2 cursor-pointer max-md:w-1/3 max-md:justify-items-center " +
          (selected ? "bg-blue-50" : "")
        }
      >
        {selected && (
          <div className="w-1 h-14 bg-blue-500 rounded-r-md max-md:h-7"></div>
        )}
        <div className="flex gap-2 py-2 pl-4 items-center max-md:pl-1">
          <Avatar
            online={online}
            username={username}
            userId={id}
            photoURL={photo}
          />
          <span className="text-gray-800 font-medium text-lg max-md:text-sm">
            {username}
          </span>
        </div>
      </div>
    )
  }
}

export default Contact
