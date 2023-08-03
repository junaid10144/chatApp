import React, { useEffect, useRef } from "react"

const ContextMenu = ({ options, cordinates, contextMenu, setContextMenu }) => {
  const contextMenuRef = useRef(null)
  // useEffect(() => {
  //   const handleOutsideClick = (event) => {
  //     if (event.target.id !== "context-opener") {
  //       if (
  //         contextMenuRef.current &&
  //         !contextMenuRef.current.contains(event.target)
  //       ) {
  //         setContextMenu(false)
  //       }
  //     }
  //   }
  //   document.addEventListener("click", handleOutsideClick)
  //   return () => {
  //     document.removeEventListener("click", handleOutsideClick)
  //   }
  // }, [contextMenu])

  const handleClick = (e, callback) => {
    e.stopPropagation()
    setContextMenu(false)
    callback()
  }
  return (
    <div
      className={`bg-indigo-300 fixed py-2 z-[100] shadow-xl`}
      ref={contextMenuRef}
      style={{
        top: cordinates.y,
        left: cordinates.x,
      }}
    >
      <ul>
        {options.map(({ name, callback }) => (
          <li
            key={name}
            onClick={(e) => handleClick(e, callback)}
            className="px-5 py-2 cursor-pointer hover:bg-indigo-500"
          >
            <span className="text-white">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ContextMenu
