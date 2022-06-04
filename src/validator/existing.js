const createError = require('http-errors');

export async function get_data(_params, _table, _origin, _id) {
    let data;

    try {
        data = await _table.find(_params).lean().exec();
    } catch (error) {
        console.error(error);
        throw new createError.InternalServerError(`${_origin}-${error}`);
    }

    if (!data) {
        throw new createError.NotFound(`${capitalize(_origin)} with ${_id} not found!`);
    }
}