import _ from 'lodash'
import EventBus from './EventBus'

function getters(service, self, name) {
  const getters = self.$store ? self.$store.getters : self.getters
  const keys = Object.keys(getters)
  const regex = name ? new RegExp('^' + name + '/') : new RegExp('')
  _(keys)
    .filter(key => regex.test(key))
    .map(key => {
      const property = key
        .replace(regex, '')
        .split('/')
        .join('.')
      _.set(service, property, getters[key])
    })
    .value()
}

function actions(service, self, name) {
  const actions = self.$store ? self.$store._actions : self._actions
  const keys = Object.keys(actions)
  const regex = name ? new RegExp('^' + name + '/') : new RegExp('')
  _(keys)
    .filter(key => regex.test(key))
    .map(key => {
      const property = key
        .replace(regex, '')
        .split('/')
        .join('.')
      const isExist = _.get(service, property)
      if (isExist) throw new Error('duplicate key')
      const that = self.$store ? self.$store : self
      _.set(service, property, function(payload, value) {
        let data
        const args = Array.prototype.slice.call(arguments)
        if (args.length === 1) {
          data = payload
        } else {
          data = args
        }
        return that.dispatch(key, data)
      })
    })
    .value()
}

function mutations(service, self, name) {
  const mutations = self.$store ? self.$store._mutations : self._mutations
  const keys = Object.keys(mutations)
  const regex = name ? new RegExp('^' + name + '/') : new RegExp('')
  _(keys)
    .filter(key => regex.test(key))
    .map(key => {
      const props = key.replace(regex, '').split('/')
      props.splice(props.length - 1, 0, 'm')
      const property = props.join('.')
      const that = self.$store ? self.$store : self
      _.set(service, property, function(prop, value) {
        let data = {}
        const args = Array.prototype.slice.call(arguments)
        if (args.length === 1) {
          data = prop
        } else {
          data = args
        }
        return that.commit(key, data)
      })
    })
    .value()
}

function state(service, self, name) {
  const state = self.$store ? self.$store.state : self.state
  const key = name.split('/').join('.')
  exportState(state, key, service)
}

function exportState(state, key, service) {
  const keys = key ? Object.keys(_.get(state, key)) : Object.keys(state)
  _(keys)
    .map(function(prop) {
      if (!_.get(service, prop)) {
        const prop2 = key ? `${key}.${prop}` : prop
        _.set(service, prop, _.get(state, prop2))
      } else {
        const state2 = key ? _.get(state, key) : state
        exportState(state2, prop, service[prop])
      }
    })
    .value()
}

// function capitalizeFirstCharacter(str) {
//   return str[0].toUpperCase() + str.substring(1)
// }

export default function Store(name = '', store) {
  let ref = this
  if (store) {
    ref = store
  }
  const names = name
    .trim()
    .replace(' ', '')
    .split(',')
  let group = {},
    prop
  names.forEach(name => {
    let service = {}
    getters(service, ref, name)
    actions(service, ref, name)
    mutations(service, ref, name)
    state(service, ref, name)
    _.merge(service, EventBus.getInstance(name))

    const regex = /.+\/([-_\w\d]+)$/
    prop = (regex.test(name) ? regex.exec(name)[1] : name) || 'Root'
    group[prop] = service
  })

  return names.length > 1 ? group : group[prop]
}
