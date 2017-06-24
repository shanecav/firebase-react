// @flow

import { Component, Children } from 'react'
import PropTypes from 'prop-types'

export default class FirebaseProvider extends Component {
  firebase: Object

  getChildContext () {
    return { firebase: this.firebase }
  }

  constructor (props: Object, context: Object) {
    super(props, context)
    this.firebase = props.firebase
  }

  render () {
    return Children.only(this.props.children)
  }
}

if (process.env.NODE_ENV !== 'production') {
  // $FlowIgnore
  FirebaseProvider.prototype.componentWillReceiveProps = function (nextProps) {
    const { firebase } = this
    const { firebase: nextFirebase } = nextProps

    if (firebase !== nextFirebase) {
      const message = '<FirebaseProvider> does not support changing its firebase prop on the fly.'
      /* eslint-disable no-console */
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error(message)
      }
      /* eslint-enable no-console */
      try {
        // This error was thrown as a convenience so that if you enable
        // "break on all exceptions" in your console,
        // it would pause the execution at this line.
        throw new Error(message)
        /* eslint-disable no-empty */
      } catch (e) {}
      /* eslint-enable no-empty */
    }
  }
}

FirebaseProvider.propTypes = {
  firebase: PropTypes.object.isRequired,
  children: PropTypes.element.isRequired,
}
FirebaseProvider.childContextTypes = {
  firebase: PropTypes.object.isRequired,
}
FirebaseProvider.displayName = 'FirebaseProvider'
