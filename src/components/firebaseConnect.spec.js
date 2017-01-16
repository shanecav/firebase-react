import '../../test/jsdom-setup'
import React from 'react'
import { mount } from 'enzyme'

import firebaseConnect from './firebaseConnect'

describe('firebaseConnect', () => {
  const firebase = {
    database: jest.fn(() => 'firebaseDb'),
    storage: jest.fn(() => 'firebaseStorage'),
  }

  it('returns a function', () => {
    const mapDbToProps = (db, p) => ({})
    const componentWrapper = firebaseConnect(mapDbToProps)
    expect(typeof componentWrapper).toBe('function')
  })

  it('returned function returns HOC FirebaseConnect', () => {
    const mapDbToProps = (db, p) => ({})
    const componentWrapper = firebaseConnect(mapDbToProps)
    const SomeComponent = (props) => <div />
    const HOC = componentWrapper(SomeComponent)
    const wrapper = mount(<HOC />, { context: { firebase } })
    expect(wrapper.name()).toBe('FirebaseConnect')
    firebase.database.mockClear()
  })

  describe('FirebaseConnect', () => {
    it('throws if no firebase in context', () => {
      const mapDbToProps = (db, p) => ({})
      const componentWrapper = firebaseConnect(mapDbToProps)
      const SomeComponent = (props) => <div />
      const HOC = componentWrapper(SomeComponent)
      expect(() => mount(<HOC />)).toThrow(/FirebaseProvider as an ancestor/)
    })

    it('calls mapDbToProps with its own props and context.firebase', () => {
      const mapDbToProps = jest.fn((db, p) => ({}))
      const componentWrapper = firebaseConnect(mapDbToProps)
      const SomeComponent = (props) => <div />
      const HOC = componentWrapper(SomeComponent)
      const props = {name: 'Shane'}
      mount(<HOC {...props} />, { context: { firebase } })

      const calls = mapDbToProps.mock.calls
      expect(calls.length).toBe(1)
      expect(calls[0][0]).toEqual(firebase.database())
      expect(calls[0][1]).toEqual(props)
      expect(firebase.database.mock.calls.length).toBe(2)
      firebase.database.mockClear()
    })

    describe('subscriptions and state', () => {
      const snapshot = val => ({ val: () => val })
      const returnedQueries = [] // accessible reference to result below
      const mapDbToProps = jest.fn((db, props) => {
        const resultQueries = {
          foo: { on: jest.fn((event, cb) => cb(snapshot({ x: 'foo', name: props.name }))), off: jest.fn() },
          bar: [
            { on: jest.fn((event, cb) => cb(snapshot({ x: 'bar1' }))), off: jest.fn() },
            { on: jest.fn((event, cb) => cb(snapshot({ x: 'bar2', y: 'bar3' }))), off: jest.fn() },
          ],
          baz: {
            queries: [
              { on: jest.fn((event, cb) => cb(snapshot({ x: 'baz1' }))), off: jest.fn() },
              { on: jest.fn((event, cb) => cb(snapshot({ x: 'baz2', y: 'baz3' }))), off: jest.fn() },
            ],
          },
          butt: {
            asMap: true,
            queries: [
              { on: jest.fn((event, cb) => cb(snapshot({ x: 'butt1', y: 'butt2' }))), off: jest.fn() },
              { on: jest.fn((event, cb) => cb(snapshot({ x: 'butt3', z: 'butt4' }))), off: jest.fn() },
            ],
          },
          buttz: {
            once: true,
            queries: [
              { once: jest.fn((event, cb) => cb(snapshot({ x: 'buttz1' }))), off: jest.fn() },
              { once: jest.fn((event, cb) => cb(snapshot({ x: 'buttz2', y: 'buttz3' }))), off: jest.fn() },
            ],
          },
        }
        resultQueries.foo.once = () => null // make it seem like a single firebase query
        returnedQueries.push(resultQueries) // make it accessible outside this function
        return resultQueries
      })

      // Mount HOC
      const componentWrapper = firebaseConnect(mapDbToProps)
      const SomeComponent = (props) => <div />
      const HOC = componentWrapper(SomeComponent)
      const props = {name: 'Shane'}
      const wrapper = mount(<HOC {...props} />, { context: { firebase } })

      it('sets up listeners and initial fetch when mounted', () => {
        // single
        expect(returnedQueries[0].foo.on.mock.calls.length).toBe(1)
        expect(returnedQueries[0].foo.on.mock.calls[0][0]).toBe('value')
        expect(typeof returnedQueries[0].foo.on.mock.calls[0][1]).toBe('function')
        // list
        expect(returnedQueries[0].bar.every(query => query.on.mock.calls.length === 1)).toBe(true)
        expect(returnedQueries[0].bar.every(query => query.on.mock.calls[0][0] === 'value')).toBe(true)
        expect(returnedQueries[0].bar.every(query => typeof query.on.mock.calls[0][1] === 'function')).toBe(true)
        // object
        expect(returnedQueries[0].baz.queries.every(query => query.on.mock.calls.length === 1)).toBe(true)
        expect(returnedQueries[0].baz.queries.every(query => typeof query.on.mock.calls[0][0] === 'string')).toBe(true)
        expect(returnedQueries[0].baz.queries.every(query => typeof query.on.mock.calls[0][1] === 'function')).toBe(true)
        // object w/ once
        expect(returnedQueries[0].buttz.queries.every(query => query.once.mock.calls.length === 1)).toBe(true)
        expect(returnedQueries[0].buttz.queries.every(query => typeof query.once.mock.calls[0][0] === 'string')).toBe(true)
        expect(returnedQueries[0].buttz.queries.every(query => typeof query.once.mock.calls[0][1] === 'function')).toBe(true)
      })

      it('maintains grouped query results in local state', () => {
        // single
        expect(wrapper.state().data.foo).toEqual({ x: 'foo', name: 'Shane' })
        // list
        expect(wrapper.state().data.bar).toEqual(['bar1', 'bar2', 'bar3'])
        // obj
        expect(wrapper.state().data.baz).toEqual(['baz1', 'baz2', 'baz3'])
        // obj as map
        expect(wrapper.state().data.butt).toEqual({ x: 'butt3', y: 'butt2', z: 'butt4' })
      })

      it('injects its state properties into WrappedComponent as props', () => {
        const child = wrapper.find(SomeComponent)
        expect(child.prop('foo')).toEqual({ x: 'foo', name: 'Shane' })
        expect(child.prop('bar')).toEqual(['bar1', 'bar2', 'bar3'])
        expect(child.prop('baz')).toEqual(['baz1', 'baz2', 'baz3'])
        expect(child.prop('butt')).toEqual({ x: 'butt3', y: 'butt2', z: 'butt4' })
      })

      it('passes other props through to WrappedComponent', () => {
        const child = wrapper.find(SomeComponent)
        expect(child.prop('name')).toBe('Shane')
      })

      it('injects cancelAllSubscriptions function as a prop to WrappedComponent', () => {
        const child = wrapper.find(SomeComponent)
        expect(typeof child.prop('cancelAllSubscriptions')).toBe('function')
      })

      it('resets listeners and state when props change', () => {
        wrapper.setProps({name: 'June'})

        // old subscriptions off
        expect(returnedQueries[0].foo.off.mock.calls.length).toBe(1)
        expect(returnedQueries[0].bar.every(query => query.off.mock.calls.length === 1)).toBe(true)
        expect(returnedQueries[0].baz.queries.every(query => query.off.mock.calls.length === 1)).toBe(true)
        expect(returnedQueries[0].buttz.queries.every(query => query.off.mock.calls.length === 1)).toBe(true)

        // new subscriptions on
        expect(returnedQueries[1].foo.on.mock.calls.length).toBe(1)
        expect(returnedQueries[1].bar.every(query => query.on.mock.calls.length === 1)).toBe(true)
        expect(returnedQueries[1].baz.queries.every(query => query.on.mock.calls.length === 1)).toBe(true)
        expect(returnedQueries[1].buttz.queries.every(query => query.once.mock.calls.length === 1)).toBe(true)

        // state represents new subscriptions
        expect(wrapper.state().data.foo).toEqual({ x: 'foo', name: 'June' })
      })

      it('removes listeners on componentWillUnmount', () => {
        try {
          wrapper.unmount()
        } catch (e) {} finally {
          // subscriptions off
          expect(returnedQueries[1].foo.off.mock.calls.length).toBe(1)
          expect(returnedQueries[1].bar.every(query => query.off.mock.calls.length === 1)).toBe(true)
          expect(returnedQueries[1].baz.queries.every(query => query.off.mock.calls.length === 1)).toBe(true)
          expect(returnedQueries[1].buttz.queries.every(query => query.off.mock.calls.length === 1)).toBe(true)
        }
      })
    })
  })
})
