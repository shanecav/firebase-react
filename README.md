# firebase-react

Connect firebase queries to react props. Supports lists of queries grouped into a single prop, allowing you to easily circumvent some Firebase query limitations.

Uses a simple HOC API inspired by [react-redux](https://github.com/reactjs/react-redux).

## Installation

`npm i -S firebase-react`

Alternatively:

`<script src="https://unpkg.com/firebase-react/dist/firebase-react.min.js"></script>` (exposes window.FirebaseReact as a global variable)

## Usage

Basic usage example below (better docs and examples coming soon):

```js
// Dinosaurs.js
import React from 'react'
import { firebaseConnect } from 'firebase-react'

const Dinosaurs = ({ shortDinosaurs, tallDinosaurs, shortAndTallDinosaurs }) => {
  return (
    <div>
      <h1>Short Dinosaurs:</h1>
      <ul>
        {shortDinosaurs.map(dino => (
          <li>{dino.name}: {dino.height}</li>
        ))}
      </ul>

      <h1>Tall Dinosaurs:</h1>
      <ul>
        {tallDinosaurs.map(dino => (
          <li>{dino.name}: {dino.height}</li>
        ))}
      </ul>

      <h1>Short and Tall Dinosaurs:</h1>
      <ul>
        {shortAndTallDinosaurs.map(dino => (
          <li>{dino.name}: {dino.height}</li>
        ))}
      </ul>
    </div>
  )
}

export default firebaseConnect((db, props) => ({
  // dinos less than 5m tall
  shortDinosaurs: db.ref('dinosaurs').orderByChild('height').endAt(5),
  // dinos greater than 25m tall
  tallDinosaurs: db.ref('dinosaurs').orderByChild('height').startAt(25),
  // dinos either shorter than 5m or taller than 25m
  shortAndTallDinosaurs: [
    db.ref('dinosaurs').orderByChild('height').endAt(5),
    db.ref('dinosaurs').orderByChild('height').startAt(25),
  ],
}))(Dinosaurs)
```

```js
// index.js
import React from 'react'
import ReactDOM from 'react-dom'
import * as firebase from 'firebase'
import { FirebaseProvider } from 'firebase-react'

import Dinosaurs from './Dinosaurs'

const config = {
  apiKey: "<Your Firebase API Key",
  authDomain: "<Your Firebase Auth Domain>",
  databaseURL: "<Your Firebase Database URL>",
  messagingSenderId: "<Your Messaging Sender ID>"
}
firebase.initializeApp(config)

ReactDOM.render(
  <FirebaseProvider firebase={firebase}>
    <Dinosaurs />
  </FirebaseProvider>,
  document.getElementById('app')
)
```
