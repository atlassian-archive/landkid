// @flow
import Joi from 'joi';
import BaseModel from './BaseModel';

type Attributes = {
  pullRequestId: string,
  commentId: string,
  userId: string
};

export default class LandRequest extends BaseModel<Attributes> {
  static schema = Joi.object().keys({
    pullRequestId: Joi.string().required(),
    commentId: Joi.string().required(),
    userId: Joi.string().required()
  });
}
