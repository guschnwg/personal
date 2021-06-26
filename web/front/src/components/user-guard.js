import { h } from "preact"
import { useState } from "preact/hooks";

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function LoginOrRegister({ onUser }) {
  const handleSubmit = async (event) => {
    event.preventDefault();

    const res = await fetch("/api/users/login_or_register", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
    })
    const data = await res.json()

    onUser(data.results);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label for="username">username</label>
        <input id="username" name="username" value={makeid(10)} />
      </div>

      <button>Login or register</button>
    </form>
  )
}

function UserGuard({ children }) {
  const [user, setUser] = useState();

  if (!user) {
    return <LoginOrRegister onUser={setUser} />
  }

  return children(user)
}

export default UserGuard;