// @flow

import forEachObjIndexed from 'ramda/src/forEachObjIndexed'

import type { Queries } from '../components/firebaseConnect'

export default function handleQueries (
  queries: Queries,
  handlers: {
    single: Function,
    list: Function,
    obj: Function,
  },
) {
  forEachObjIndexed((query, propName) => {
    // single query
    if (typeof query.once === 'function') {
      return handlers.single(query, propName)
    }

    // query list
    if (Array.isArray(query)) {
      return handlers.list(query, propName)
    }

    // query options object
    if (Array.isArray(query.queries)) {
      return handlers.obj(query, propName)
    }

    throw new TypeError(`query for ${propName} provided to mapDbToProps is an invalid type`)
  }, queries)
}
