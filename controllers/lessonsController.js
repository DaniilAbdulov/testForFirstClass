import {pg} from '../db/pg.js';
import {isDate} from '../utils/isDate.js';
import {getFilterParameters} from '../utils/getFilterParameters.js';
import {isNumber} from '../utils/isNumber.js';
import {isEmptyObj} from '../utils/isEmptyObj.js';


export class LessonsController {
    offset = 0;
    limit = 5;
    dateFilter = {};
    status = null;
    teacherIds = [];
    studentsCountFilter = {};

    setLimit = (limit) => {
      this.limit = limit;
    };

    setOffset = (offset) => {
      this.offset = offset;
    };

    setDateFilter = (filter) => {
      this.dateFilter = filter;
    };

    setStatus = (status) => {
      this.status = status;
    };

    setTeacherIds = (ids) => {
      this.teacherIds = ids;
    };

    setStudentsCountFilter = (filter) => {
      this.studentsCountFilter = filter;
    };

    setInitialValues = () => {
      this.setOffset(0);
      this.setLimit(5);
      this.setDateFilter({});
      this.setStatus(null);
      this.setTeacherIds([]);
      this.setStudentsCountFilter({});
    };

    async getLessons(req, res) {
      const {
        date,
        status,
        teacherIds,
        studentsCount,
        page,
        lessonsPerPage
      } = req?.query || {};

      const errors =
      this.validateAndPrepareParams(date, status, teacherIds, studentsCount, page, lessonsPerPage);

      if (errors.length) {
        return res
          .status(500)
          .json({reason: 'Wrong parameter', message: errors.join('; ')});
      }

      try {
        const query = this.buildQuery();
        const lessons = await query;

        return res.status(200).json({lessons: this.getFormattedLessons(lessons)});
      } catch(err) {

        return res
          .status(500)
          .json({message: err?.message});
      } finally {
        this.setInitialValues();
      }
    }

    validateAndPrepareParams(date, status, teacherIds, studentsCount, page, lessonsPerPage) {
      // В идеале, конечно, лучше все подготовить при отправке запроса с фронта,
      // а на не валидные данные выбрасывать ошибку ещё на уровне спецификации, например, с помощью openAPI
      const errors = [];

      if (lessonsPerPage) {
        const parsedInt = parseInt(lessonsPerPage);
        const newLimit = !isNaN(parsedInt) && parsedInt > 0 ? parsedInt : this.limit;

        this.setLimit(newLimit);
      }

      if (page) {
        const parsedInt = parseInt(page);
        const newOffset =
          !isNaN(parsedInt) && parsedInt > 1 ? (parsedInt - 1) * this.limit : this.offset;

        this.setOffset(newOffset);
      }

      if (date) {
        const {singleParametr, min, max} = getFilterParameters(date, 'date');

        if (singleParametr) {

          if (!isDate(singleParametr)) {
            errors.push(`Date parametr "${date}" is invalid`);
          } else {
            this.setDateFilter({singleParametr});
          }

        }

        if (min && max) {
          const someOfDateIsInvalid = isDate(min) && isDate(max);

          if (!someOfDateIsInvalid) {
            errors.push(`Some of date parameters "${min}" or "${max}" is invalid`);
          } else {
            this.setDateFilter({min, max});
          }
        }
      }

      if (status) {

        if (this.isInvalidIntInStr(status)) {
          errors.push(`Status parametr "${status}" is invalid`);
        } else {
          this.setStatus(status);
        }
      }

      if (teacherIds) {
        const splittedTeacherIds = teacherIds.split(',').map((id) => id.trim());

        const invalidId = splittedTeacherIds.find((id) => this.isInvalidIntInStr(id));

        if (invalidId) {
          errors.push(`Teacher id: "${invalidId}" in the teacherIds parametr is invalid`);
        } else {
          this.setTeacherIds(splittedTeacherIds);
        }
      }

      if (studentsCount) {
        const {singleParametr, min, max} = getFilterParameters(studentsCount, 'numbers');

        if (singleParametr) {

          if (this.isInvalidIntInStr(singleParametr)) {
            errors.push(`StudentsCount parametr "${studentsCount}" is invalid`);
          } else {
            this.setStudentsCountFilter({singleParametr});
          }
        }

        if (min && max) {
          const someOfRangeValuesIsInvalid =
            this.isInvalidIntInStr(min) || this.isInvalidIntInStr(max);

          if (someOfRangeValuesIsInvalid) {
            errors.push(`Some of studentsCount parameters "${min}" or "${max}" is invalid`);
          } else {
            this.setStudentsCountFilter({min, max});
          }
        }
      }

      return errors;
    }

    isInvalidIntInStr(str) {
      return !isNumber(str) || parseInt(str) < 0;
    }

    getFormattedLessons(lessons) {
      if (!lessons.length) {
        return [];
      }

      const coupledVisitCount = lessons.reduce((acc, {id: lessonId, visit}) => {
        if (!acc[lessonId]) {
          acc[lessonId] = {
            visitCount: 0
          };
        }

        if (visit) {
          acc[lessonId].visitCount += 1;
        }

        return acc;
      }, {});

      return Object.values(lessons.reduce((acc, lesson) => {
        const lessonId = lesson?.id;

        if (!acc[lessonId]) {
          acc[lessonId] = {
            id: lessonId,
            date: lesson?.date,
            title: lesson?.title,
            status: lesson?.status,
            visitCount: coupledVisitCount[lessonId].visitCount,
            students: [],
            teachers: []
          };
        }

        if (lesson?.student_id) {
          acc[lessonId].students.push(
            {
              id: lesson.student_id,
              name: lesson?.student_name,
              visit: lesson?.visit
            }
          );
        }

        if (lesson?.teacher_id) {
          acc[lessonId].teachers.push({
            id: lesson.teacher_id,
            name: lesson?.teacher_name
          });
        }

        return acc;
      }, {}));
    }

    buildQuery() {
      const {teacherIds, offset, limit} = this;

      const query = pg('students as s')
        .select(
          's.id as student_id',
          's.name as student_name',
          'ls.visit',
          't.id as teacher_id',
          't.name as teacher_name',
          'lessons.id',
          'lessons.date',
          'lessons.status',
          'lessons.title'
        )
        .join('lesson_students as ls', 's.id', 'ls.student_id')
        .join('lessons', 'ls.lesson_id', 'lessons.id')
        .join('lesson_teachers as lts', 'ls.lesson_id', 'lts.lesson_id')
        .join('teachers as t', 'lts.teacher_id', 't.id')
        .whereIn('ls.lesson_id', this.getLessonIdsQuery());

      if (teacherIds?.length) {
        query.whereIn('t.id', teacherIds);
      }

      query.offset(offset);
      query.limit(limit);

      return query;
    }

    getLessonIdsQuery() {
      const {status, dateFilter, studentsCountFilter} = this;

      const lessonIdsQuery = pg('lessons')
        .select('lessons.id as lesson_id')
        .join('lesson_students as ls', 'lessons.id', 'ls.lesson_id')
        .join('students', 'students.id', 'ls.student_id');

      if (status) {
        lessonIdsQuery.where('lessons.status', '=', status);
      }

      if (dateFilter && !isEmptyObj(dateFilter)) {
        const {singleParametr, min, max} = dateFilter;

        if (singleParametr) {
          lessonIdsQuery.where('lessons.date', '=', [singleParametr]);
        } else if (min && max) {
          lessonIdsQuery.whereBetween('lessons.date', [min, max]);
        }
      }

      if (studentsCountFilter && !isEmptyObj(studentsCountFilter)) {
        lessonIdsQuery.groupBy('lessons.id');

        const {singleParametr, min, max} = studentsCountFilter;

        if (singleParametr) {
          lessonIdsQuery.having(pg.raw('COUNT(students.id) > ?', [singleParametr]));
        } else if (min && max) {
          lessonIdsQuery.having(pg.raw('COUNT(students.id) BETWEEN ? AND ?', [min, max]));
        }

      }

      return lessonIdsQuery;
    }
}