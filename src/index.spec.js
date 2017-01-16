import * as index from './index'

describe('index', () => {
  it('should export FirebaseProvider', () => {
    expect(index.FirebaseProvider).toBeDefined()
  })

  it('should export firebaseConnect', () => {
    expect(index.firebaseConnect).toBeDefined()
  })
})
