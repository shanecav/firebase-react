// @flow

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import map from 'ramda/src/map'
import values from 'ramda/src/values'
import merge from 'ramda/src/merge'
import range from 'ramda/src/range'
import pick from 'ramda/src/pick'

import handleQueries from '../utils/handle-queries'

type SingleQuery = Object
type QueryList = Array<SingleQuery>
type QueryObj = {
  asMap?: boolean,
  once?: boolean,
  queries: QueryList,
}
export type Queries = { [key: string]: SingleQuery|QueryList|QueryObj }
type RawData = {
  [key: string]: {
    options: {
      once: ?boolean,
      asMap: ?boolean,
    },
    data: Array<{
      val: Object,
      meta: { ready: boolean },
    }>,
  }
}

const firebaseConnect = (
  mapDbToProps?: (db: Object, p: Object)=>Queries
) => (
  WrappedComponent: ReactClass<*>
) => {
  class FirebaseConnect extends Component {
    queries: Queries
    rawData: RawData
    state: {
      data: { [key: string]: { raw: Object, prop: Object } },
      subscriptionsAreSetup: boolean,
    }

    static contextTypes = { firebase: PropTypes.object }
    static displayName = 'FirebaseConnect'

    constructor (props: Object, context: Object) {
      super(props)

      if (!context || !context.firebase) {
        throw new Error('firebaseConnect must have FirebaseProvider as an ancestor')
      }

      this.state = {
        data: {},
        subscriptionsAreSetup: false,
      }

      if (mapDbToProps) {
        this.queries = mapDbToProps(context.firebase.database(), props)
        this.rawData = this._getInitialRawData(this.queries)
      }
    }

    componentDidMount () {
      if (mapDbToProps) {
        this._setupSubscriptions(this.queries)
      }
    }

    componentWillReceiveProps (nextProps: Object) {
      // if props are different, cancel and reset all query subscriptions
      if (mapDbToProps && this.props !== nextProps) {
        this._cancelSubscriptions(this.queries)
        this.queries = mapDbToProps(this.context.firebase.database(), nextProps)
        this.rawData = this._getInitialRawData(this.queries)
        this._setupSubscriptions(this.queries)
      }
    }

    componentWillUnmount () {
      this._cancelSubscriptions(this.queries)
    }

    _getInitialRawData = (queries: Queries): RawData => {
      return map(query => {
        let numQueries
        // single query
        if (typeof query.once === 'function') {
          numQueries = 1
        }
        // query list
        if (Array.isArray(query)) {
          numQueries = query.length
        }
        // query options object
        if (Array.isArray(query.queries)) {
          numQueries = query.queries.length
        }
        // this rawData will have numQueries # of results; prepare array
        return {
          options: pick(['once', 'asMap'], query),
          data: range(0, numQueries).map(rd => ({
            val: undefined,
            meta: { ready: false },
          })),
        }
      }, queries)
    }

    _allRawDataReady = ():boolean => {
      let ready = true
      map(rawDataItem => {
        if (!rawDataItem.data.every(rdi => rdi.meta.ready)) ready = false
      }, this.rawData)
      return ready
    }

    _setupSubscriptions = (queries: Queries):void => {
      handleQueries(queries, {
        single: (query, propName) => {
          query.on('value', snapshot => {
            // set rawData
            this.rawData[propName].data[0] = {
              val: snapshot.val(),
              meta: { ready: true },
            }

            // set state if all are ready
            this._setStateDataIfReady()
          })
        },

        list: (queryList, propName) => {
          queryList.forEach((query, i) => {
            query.on('value', snapshot => {
              const thisData = this.rawData[propName].data

              // set rawData for this propName + query index
              thisData[i].meta.ready = true
              thisData[i].val = snapshot.val()
              // remove any extra indexes (from old queries)
              thisData.splice(
                queryList.length,
                thisData.length - queryList.length
              )

              // set state if all are ready
              this._setStateDataIfReady()
            })
          })
        },

        obj: (queryObj, propName) => {
          queryObj.queries.forEach((query, i) => {
            let method = 'on'
            if (queryObj.once) method = 'once'
            query[method]('value', snapshot => {
              const thisData = this.rawData[propName].data

              // set rawData for this propName + query index
              thisData[i].meta.ready = true
              thisData[i].val = snapshot.val()
              // remove any extra indexes (from old queries)
              thisData.splice(
                queryObj.queries.length,
                thisData.length - queryObj.queries.length
              )

              // set state if all are ready
              this._setStateDataIfReady()
            })
          })
        },
      })

      this.setState({ subscriptionsAreSetup: true })
    }

    _setStateDataIfReady = ():void => {
      if (this._allRawDataReady()) {
        this.setState(prevState => ({
          data: map(dataSet => {
            let newData =
              dataSet.options.asMap
              ? dataSet.data.reduce((a, d) => merge(a, d.val), {})
              : dataSet.data.length === 1
                ? dataSet.data[0].val
                : dataSet.data.reduce((a, d) => a.concat(values(d.val)), [])

            return newData
          }, this.rawData),
        }))
      }
    }

    _cancelSubscriptions = (queries: Queries, resetRawData: ?boolean = true):void => {
      handleQueries(queries, {
        single: (query, propName) => {
          query.off()
        },

        list: (queryList, propName) => {
          queryList.forEach((query) => {
            query.off()
          })
        },

        obj: (queryObj, propName) => {
          queryObj.queries.forEach((query) => {
            query.off()
          })
        },
      })

      if (resetRawData) this.rawData = this._getInitialRawData(queries)
      this.setState({ subscriptionsAreSetup: false })
    }

    cancelAllSubscriptions = ():void => {
      if (this.state.subscriptionsAreSetup) {
        this._cancelSubscriptions(this.queries)
      }
    }

    render () {
      return (
        <WrappedComponent
          firebase={this.context.firebase}
          cancelAllSubscriptions={this.cancelAllSubscriptions}
          {...this.state.data}
          {...this.props} />
      )
    }
  }

  return FirebaseConnect
}

export default firebaseConnect
