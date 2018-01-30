// // @flow
// import Joi from 'joi';
// import BaseModel from './BaseModel';

// /**
//  * I'm currently not using this and am instead just using a LandRequest type in ../types.js
//  * We can look at adding these validations later
//  */

// type Attributes = {
//   pullRequestId: string,
//   commentId: string,
//   userId: string
// };

// export default class LandRequest extends BaseModel<Attributes> {
//   static schema = Joi.object().keys({
//     pullRequestId: Joi.string().required(),
//     commentId: Joi.string().required(),
//     userId: Joi.string().required()
//   });
// }
