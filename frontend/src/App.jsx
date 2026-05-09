import { useState, useEffect } from 'react'
import axios from "axios"

function App() {


  const [notes, setNotes] = useState([])

  function fetchNotes(){
     axios.get('http://localhost:3000/notes').then((res)=>{
     setNotes(res.data.note)
  })
  }


  useEffect(()=>{
    fetchNotes()
  },[])


  function handleSubmit(e){
    e.preventDefault()

    const {title, description} = e.target.elements

    console.log(title.value , description.value)

    axios.post('http://localhost:3000/notes',{
      title : title.value,
      description : description.value
    })
    .then(res=>{
        console.log(res.data)
        fetchNotes()
    })
  }
  
  function handleDeleteNote(noteId){
    console.log(noteId)
    axios.delete("http://localhost:3000/notes/"+noteId)
    .then(res=>{
      console.log(res.data)
      fetchNotes()
    })
  }

  function handleEditNote(noteId){

    const newTitle = prompt("Enter new title")
    const newDescription = prompt("Enter new description")

    axios.patch("http://localhost:3000/notes/" + noteId, {
    title: newTitle,
    description: newDescription
    })
    .then(res => {
      console.log(res.data)

  // Fetch updated notes again
      fetchNotes()
  })
  }

  return (
    <>
    <form className="note-create-form" onSubmit={handleSubmit} >
      <input name="title" type="text" placeholder='Enter Title'/>
      <input name='description' type="text" placeholder='Enter Discription'/>
      <button>Create</button>
    </form>

    <div className="notes">
      {
        notes.map(note=>{
          return <div className="note">
          <h1>{note.title}</h1>
          <p>{note.description}</p>
          <button onClick={()=>{handleDeleteNote(note._id)}}>Delete</button>
          <button onClick={()=>{handleEditNote(note._id)}}>Edit</button>
      </div>
        })
      }
     
    </div>
    </>
  )
}

export default App
