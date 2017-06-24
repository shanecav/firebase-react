import '../../test/jsdom-setup'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { shallow, mount } from 'enzyme'

import FirebaseProvider from './FirebaseProvider'

describe('FirebaseProvider', () => {
  const firebase = {
    database: jest.fn(),
    storage: jest.fn(),
  }

  const SomeComponent = (props) => <div />
  class Child extends Component {
    static contextTypes = { firebase: PropTypes.object }
    render () {
      return <SomeComponent firebase={this.context.firebase} />
    }
  }

  it('should enforce a single child', () => {
    // Ignore propTypes warnings
    const propTypes = FirebaseProvider.propTypes
    FirebaseProvider.propTypes = {}

    try {
      expect(() => shallow(
        <FirebaseProvider firebase={firebase}>
          <div />
        </FirebaseProvider>
      )).not.toThrow()

      expect(() => shallow(
        <FirebaseProvider firebase={firebase} />
      )).toThrow(/a single React element child/)

      expect(() => shallow(
        <FirebaseProvider firebase={firebase}>
          <div />
          <div />
        </FirebaseProvider>
      )).toThrow(/a single React element child/)
    } finally {
      FirebaseProvider.propTypes = propTypes
    }
  })

  it('should add firebase to the child context', () => {
    const wrapper = mount(
      <FirebaseProvider firebase={firebase}>
        <Child />
      </FirebaseProvider>
    )
    const child = wrapper.find(SomeComponent)
    expect(child.prop('firebase')).toBe(firebase)
  })
})
