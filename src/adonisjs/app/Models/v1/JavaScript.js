'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class JavaScript extends Model {
    case(){
        return this.belongsTo('App/Models/v1/Case');
    }

    style(){
        return this.belongsTo('App/Models/v1/Style');
    }

    dcc(){
        return this.belongsTo('App/Models/v1/Dcc');
    }
}

module.exports = JavaScript