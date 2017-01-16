import handleQueries from './handle-queries'

describe('handleQueries', () => {
  it('can handle single queries', () => {
    const query = jest.fn()
    query.once = () => null // make it seem like a firebase query
    const queries = {
      todos: query,
    }
    const handlers = {
      single: jest.fn(q => q()),
    }
    handleQueries(queries, handlers)

    expect(query.mock.calls.length).toBe(1)
    expect(handlers.single.mock.calls.length).toBe(1)
  })

  it('can handle query lists', () => {
    const queries = {
      todos: [
        jest.fn(),
        jest.fn(),
      ],
    }
    const handlers = {
      list: jest.fn(qs => qs.map(q => q())),
    }
    handleQueries(queries, handlers)

    expect(queries.todos[0].mock.calls.length).toBe(1)
    expect(queries.todos[1].mock.calls.length).toBe(1)
    expect(handlers.list.mock.calls.length).toBe(1)
  })

  it('can handle query objects', () => {
    const queries = {
      todos: {
        asObject: true,
        once: false,
        queries: [
          jest.fn(),
          jest.fn(),
        ],
      },
    }
    const handlers = {
      obj: jest.fn(qs => qs.queries.map(q => q())),
    }
    handleQueries(queries, handlers)

    expect(queries.todos.queries[0].mock.calls.length).toBe(1)
    expect(queries.todos.queries[1].mock.calls.length).toBe(1)
    expect(handlers.obj.mock.calls.length).toBe(1)
  })

  it('throws if there are invalid queries', () => {
    const queries = {
      todos: 'not a query',
    }
    const handlers = {
      single: jest.fn(),
      list: jest.fn(),
      obj: jest.fn(),
    }
    const shouldThrow = () => handleQueries(queries, handlers)

    expect(shouldThrow).toThrowError(TypeError)
    expect(handlers.single.mock.calls.length).toBe(0)
    expect(handlers.list.mock.calls.length).toBe(0)
    expect(handlers.obj.mock.calls.length).toBe(0)
  })
})
