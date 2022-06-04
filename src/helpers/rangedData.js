const dayjs = require('dayjs')
const excelJS = require('exceljs');
const { capitalCase } = require('change-case');
const mongoose = require('mongoose');
const User = require('../models/Users')

const renderTime = (_time) => {
    let _date = new Date(_time)
    var hours = _date.getHours()
    var minutes = _date.getMinutes()
    var ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes
    var strTime = hours + ':' + minutes + ' ' + ampm
    return strTime
}

const filterByStatus = (_data, type) => {
    let _d = _data.status === type ? _data : '';

    if (_d.length > 0) {
        _d = _d[0]
    }

    if (_d) {
        return {
            time: _d.time === undefined ? 'n/a' : renderTime(_d.time),
            location: _d.address === undefined ? 'n/a' : _d.address
        }
    } else {
        return {
            time: '-',
            location: 'n/a',
        }
    }
}

const formatRangeData = (_user) => {
    let _data =
        _user.length > 0 &&
        _user.map((v_user, k) => {
            if (!v_user.reports) {
                return {
                    id: v_user.Employee._id,
                    status: false,
                    displayName: v_user.Employee.displayName,
                    'time-in': '',
                    'break-in': '',
                    'break-out': '',
                    'time-out': '',
                    'time-in-location': '',
                    'break-in-location': '',
                    'break-out-location': '',
                    'time-out-location': '',
                }
            } else {
                let _exist = v_user.reports.Records.map((v_record, k) => {

                    return {
                        id: v_user.Employee._id,
                        status: true,
                        displayName: capitalCase(v_user.Employee.displayName),
                        'time-in': filterByStatus(v_record.record, 'time-in').time,
                        'break-in': filterByStatus(v_record.record, 'break-in').time,
                        'break-out': filterByStatus(v_record.record, 'break-out').time,
                        'time-out': filterByStatus(v_record.record, 'time-out').time,
                        date: new Date(v_record.record.createdAt),
                        'time-in-location': filterByStatus(v_record.record, 'time-in').location,
                        'break-in-location': filterByStatus(v_record.record, 'break-in').location,
                        'break-out-location': filterByStatus(v_record.record, 'break-out').location,
                        'time-out-location': filterByStatus(v_record.record, 'time-out').location,
                    }
                })

                return _exist
                    .filter(function (e) {
                        return e
                    })
                    .pop()
            }
        })

    if (!_data) return
    return _data
}

const generateExcelFile = async (title, formatted_result) => {

    const workbook = new excelJS.Workbook();  // Create a new workbook
    const path = "./files";  // Path to download excel


    await formatted_result.map(async (v, k) => {
        const worksheet = workbook.addWorksheet(dayjs(v.date).format('MMM DD,YYYY')); // New Worksheet

        worksheet.columns = [
            { header: "No.", key: "s_no", width: 5 },
            { header: "Full name", key: "display_name", width: 50 },
            { header: "Time in", key: "time_in", width: 10 },
            { header: "Break in", key: "break_in", width: 10 },
            { header: "Break out", key: "break_out", width: 10 },
            { header: "Time out", key: "time_out", width: 10 },
        ];

        let counter = 1;
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });


        if (v.rows) {
            v.rows && v.rows.map(async (employee) => {
                let d;
                if (employee.displayName === null || !employee.displayName) {
                    const user = await User.find({ _id: mongoose.Types.ObjectId(employee._id) }).lean().exec();
                    d = {
                        display_name: user[0].phone
                    };
                } else {
                    d = {
                        display_name: capitalCase(employee.displayName)
                    };
                }

                if (employee.reports === null) {
                    d['time_in'] = d['break_in'] = d['break_out'] = d['time_out'] = '-';
                } else {
                    employee.reports.map(record => {
                        d['time_in'] = filterByStatus(record, 'time-in').time
                        d['break_in'] = filterByStatus(record, 'break-in').time
                        d['break_out'] = filterByStatus(record, 'break-out').time
                        d['time_out'] = filterByStatus(record, 'time-out').time
                    })
                }

                d.s_no = counter;

                worksheet.addRow(d); // Add data in worksheet
                counter++;

            })
        }
    });

    let file_name = `${path}/${title}${Math.floor(100000 + Math.random() * 900000)}.xlsx`;
    try {
        return await workbook.xlsx.writeFile(file_name)
            .then(() => {
                return {
                    status: "success",
                    message: "file successfully downloaded",
                    path: file_name,
                };
            });
    } catch (err) {
        return {
            status: "error",
            message: "Something went wrong",
        };
    }

}


module.exports = {
    formatRangeData,
    generateExcelFile,
    renderTime,
    filterByStatus,
    capitalCase
}