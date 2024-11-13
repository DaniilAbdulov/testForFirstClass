import knex from "knex";
import {connection} from "../knexfile.js";

export const pg = knex(connection);