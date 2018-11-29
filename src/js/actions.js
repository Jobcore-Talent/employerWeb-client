import React from 'react';
import Flux from '@4geeksacademy/react-flux-dash';
import {Session} from 'bc-react-session';
import {Notify} from 'bc-react-notifier';
import {Shift} from './views/shifts';
import {Clockin} from './views/payroll';
import {POST, GET, PUT, DELETE} from './utils/api_wrapper';
import log from './utils/log';

export const login = (email, password, history) => new Promise((resolve, reject) => POST('login', {
      username_or_email: email,
      password: password
    })
    .then(function(data){
        console.log("User: ",data.user);
        if(!data.user.profile.employer){
            Notify.error("Only employers are allowed to login into this application");
            reject("Only employers are allowed to login into this application");
        }
        else if(!data.user.is_active){
            Notify.error("You need to validate your email before being able to login");
            reject("You need to validate your email before being able to login");
        }
        else{
            Session.start({ payload: {
                user: data.user, access_token: data.token 
            }});
            history.push('/');
            resolve();
        }
    })
    .catch(function(error) {
        reject(error.message || error);
        Notify.error(error.message || error);
        log.error(error);
    })
);

export const signup = (formData, history) => new Promise((resolve, reject) => POST('user/register', {
      email: formData.email,
      account_type: formData.account_type,
      employer: formData.company,
      username: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      password: formData.password
    })
    .then(function(data){
        Notify.success("You have signed up successfully, proceed to log in");
        history.push('/login');
        resolve();
    })
    .catch(function(error) {
        reject(error.message || error);
        Notify.error(error.message || error);
        log.error(error);
    })
);

export const remind = (email) => new Promise((resolve, reject) => POST('user/password/reset', {
      email: email
    })
    .then(function(data){
        resolve();
        Notify.success("Check your email!");
    })
    .catch(function(error) {
        Notify.error(error.message || error);
        reject(error.message || error);
        log.error(error);
    })
);

export const logout = () => {
    Session.destroy();
};

export const fetchAll = (entities) => new Promise((resolve, reject) => {
    let requests = [];
    const checkPromiseResolution = () => {
            const hasPending = requests.find(r => r.pending == true);
            if(!hasPending){
                const hasError = requests.find(r => r.error == true);
                if(hasError) reject();
                else resolve();
            }
        };
        
    entities.forEach((entity) => {
        const currentRequest = { entity: entity.slug || entity, pending: true, error: false};
        requests.push(currentRequest);
        
        GET(entity.slug || entity)
        .then(function(list){
            if(typeof entity.callback == 'function') entity.callback();
            Flux.dispatchEvent(entity.slug || entity, list);

            currentRequest.pending = false;
            checkPromiseResolution();
        })
        .catch(function(error) {
            Notify.error(error.message || error);
            log.error(error);
            
            currentRequest.pending = false;
            currentRequest.error = true;
            checkPromiseResolution();
        });
    });
});

export const fetchSingle = (entity, id, event_name=null) => {
    const url = entity.slug || entity;
    GET(url+'/'+id)
        .then(function(data){
            if(typeof entity.callback == 'function') entity.callback();
            Flux.dispatchEvent(event_name || entity.slug || entity, data);
        })
        .catch(function(error) {
            Notify.error(error.message || error);
            log.error(error);
        });
};

export const search = (entity, queryString) => new Promise((accept, reject) => 
    GET(entity, queryString)
        .then(function(list){
            if(typeof entity.callback == 'function') entity.callback();
            Flux.dispatchEvent(entity.slug || entity, list);
            accept(list);
        })
        .catch(function(error) {
            Notify.error(error.message || error);
            log.error(error);
            reject(error);
        })
);

export const create = (entity, data) => POST(entity.url || entity, data)
    .then(function(incoming){
        let entities = store.getState(entity.slug || entity);
        data.id = incoming.id;
        if(!entities || !Array.isArray(entities)) entities = [];
        Flux.dispatchEvent(entity.slug || entity, entities.concat([data]));
        Notify.success("The "+(entity.slug || entity).substring(0, (entity.slug || entity).length - 1)+" was created successfully");
    })
    .catch(function(error) {
        Notify.error(error.message || error);
        log.error(error);
    });
    
export const update = (entity, data) => {
    const path = (typeof entity == 'string') ? `${entity}/${data.id}` : `${entity.path}/${data.id}`;
    const event_name = (typeof entity == 'string') ? entity : entity.event_name;
    PUT(path, data)
        .then(function(incomingObject){
            let entities = store.replaceMerged(event_name, data.id, data);
            Flux.dispatchEvent(event_name, entities);
            
            const name = path.split('/');
            Notify.success("The "+name[0].substring(0, name[0].length - 1)+" was updated successfully");
        })
        .catch(function(error) {
            Notify.error(error.message || error);
            log.error(error);
        });
};

export const updateProfile = (data) => {
    PUT(`profiles/${data.id}`, data)
        .then(function(incomingObject){
            const payload = Session.getPayload();
            const user = Object.assign(payload.user, { profile: incomingObject });
            Session.setPayload({ user });
        })
        .catch(function(error) {
            Notify.error(error.message || error);
            log.error(error);
        });
};

export const remove = (entity, data) => {
    const path = (typeof entity == 'string') ? `${entity}/${data.id}` : `${entity.path}/${data.id}`;
    const event_name = (typeof entity == 'string') ? entity : entity.event_name;
    DELETE(path)
        .then(function(incomingObject){
            let entities = store.remove(event_name, data.id);
            Flux.dispatchEvent(event_name, entities);
            
            const name = path.split('/');
            Notify.success("The "+name[0].substring(0, name[0].length - 1)+" was deleted successfully");
        })
        .catch(function(error) {
            Notify.error(error.message || error);
            log.error(error);
        });
};

export const rejectCandidate = (shiftId, applicant) => {
    const shift = store.get('shifts', shiftId);
    if(shift){
        const newCandidates = shift.candidates.filter(candidate => candidate.id != applicant.id);
        const updatedShift = {
          candidates: newCandidates.map(cand => cand.id)
        };
        PUT(`shifts/${shiftId}/candidates`, updatedShift).then(() => {
            
            Flux.dispatchEvent('shifts', store.replaceMerged("shifts", shiftId, {
              candidates: newCandidates
            }));
            Flux.dispatchEvent('applicants', store.remove("applicants", applicant.id));
            
            Notify.success("The candidate was successfully rejected");
        });
    }
    else Notify.error("Shift not found");
};

export const acceptCandidate = (shiftId, applicant) => {
    const shift = store.get('shifts', shiftId);
    if(shift){
        if (shift.status !== 'FILLED' || shift.employees.length < shift.maximum_allowed_employees) {
            
            const newEmployees = shift.employees.concat([applicant]);
            const newCandidates = shift.candidates.filter(employee => employee.id != applicant.id);
            const shiftData = { 
                employees: newEmployees.map(emp => emp.id),  
                candidates: newCandidates.map(can => can.id)
            };
            PUT(`shifts/${shiftId}/candidates`, shiftData).then((data) => {
                
                Flux.dispatchEvent('applicants', store.filter("applicants", (item) => (item.shift.id != shiftId || item.employee.id != applicant.id)));
                Flux.dispatchEvent('shifts', store.replaceMerged("shifts", shiftId.id, {
                    employees: newEmployees,
                    candidates: newCandidates
                }));
                Notify.success("The candidate was successfully accepted");
                
            });
        } else {
          Notify.error('This shift is already filled.');
        }
    }
    else Notify.error("Shift not found");
};

export const updateTalentList = (action, employee, listId) => {
    const favoriteList = store.get("favlists", listId);
    return new Promise((resolve, reject) => {
        if(favoriteList){
            let employeeIdsArr = favoriteList.employees.map(employee => employee.id || employee);
            if (action === 'add') {
              employeeIdsArr.push(employee.id || employee);
            }
            else if (action === 'delete') {
              employeeIdsArr = employeeIdsArr.filter((id) => id != (employee.id || employee));
            }
            PUT('favlists/'+listId, { employees: employeeIdsArr }).then((updatedFavlist) => {
                Flux.dispatchEvent('favlists', store.replaceMerged("favlists", listId, { 
                    employees: updatedFavlist.employees
                }));
                Notify.success(`The talent was successfully ${(action == 'add') ? 'added' : 'removed'}`);
                resolve(updatedFavlist);
            })
            .catch(error => {
                Notify.error(error.message || error);
                log.error(error);
                reject(error);
            });
        }
        else{
            Notify.error("Favorite list not found");
            reject();
        }
    });
};

export const fillPayrollBlocks = (shifts) => {
    Flux.dispatchEvent('single_payroll_detail', shifts);
};

export const updatePayroll = ({ talent, clockins }) => {
    //TODO: finish payroll update
};

class _Store extends Flux.DashStore{
    constructor(){
        super();
        this.addEvent('positions');
        this.addEvent('venues');
        this.addEvent('current_employer');
        this.addEvent('shiftinvites');
        this.addEvent('jobcore-invites');
        this.addEvent('employees', (employees) => {
            
            if(!Array.isArray(employees)) return [];
            
            const payload = Session.getPayload();
            return employees.map((em) => {
                //if the talent has an employer
                em.fullName = function() { return (this.user.first_name.length>0) ? this.user.first_name + ' ' + this.user.last_name : 'No name specified'; };
                if(typeof payload.user.profile.employer != 'undefined'){
                    if(typeof em.favoriteLists =='undefined') em.favoriteLists = em.favoritelist_set.filter(fav => fav.employer == payload.user.profile.employer);
                    else{
                        em.favoriteLists = em.favoritelist_set.map(fav => store.get('favlists', fav.id || fav));
                    }
                }
                return em;
            });
        });
        this.addEvent('favlists');
        this.addEvent('badges');
        this.addEvent('payroll');
        this.addEvent('single_payroll_detail', (payroll) => {
            
            const clockins = payroll.clockins;
            payroll.clockins = (!clockins || (Object.keys(clockins).length === 0 && clockins.constructor === Object)) ? [] : clockins.map((clockin) => {
                //already transformed
                return Clockin(clockin).defaults().unserialize();
            });
            
            return payroll;
        });
        
        this.addEvent('applications', (applicants) => {
            return (!applicants || (Object.keys(applicants).length === 0 && applicants.constructor === Object)) ? [] : applicants.map(app => {
                app.shift = Shift(app.shift).defaults().unserialize();
                return app;
            });
        });
        this.addEvent('shifts', (shifts) => {
            
            const newShifts = (!shifts || (Object.keys(shifts).length === 0 && shifts.constructor === Object)) ? [] : shifts.map((shift) => {
                //already transformed
                return Shift(shift).defaults().unserialize();
            });
            
            const applicants = this.getState('applications');
            if(!applicants && Session.get().isValid) fetchAll(['applications']);
            
            return newShifts;
        });
    }
    
    get(type, id){
        const entities = this.getState(type);
        if(entities) return entities.find(ent => ent.id == parseInt(id, 10));
        else return null;
    }
    add(type, item){
        const entities = this.getState(type);
        if(item) return entities.concat([item]);
        //else return entities;
        else throw new Error('Trying to add a null item into '+type);
    }
    replace(type, id, item){
        const entities = this.getState(type);
        if(!entities) throw new Error("No item found in "+type);
        
        if(Array.isArray(entities)){
            return entities.concat([]).map(ent => {
                if(ent.id != parseInt(id, 10)) return ent;
                return item;
            });
        }
        else return item;
    }
    replaceMerged(type, id, item){
        const entities = this.getState(type);
        if(!entities) throw new Error("No item found in "+type);
        if(Array.isArray(entities)){
            return entities.concat([]).map(ent => {
                if(ent.id != parseInt(id, 10)) return ent;
                return Object.assign(ent, item);
            });
        }
        else{
            return Object.assign(entities, item);
        }
    }
    remove(type, id){
        const entities = this.getState(type);
        if(entities) return entities.filter(ent => {
            return (ent.id != parseInt(id, 10));
        });
        else throw new Error("No items found in "+entities);
    }
    filter(type, callback){
        const entities = this.getState(type);
        if(entities) return entities.filter(callback);
        else throw new Error("No items found in "+entities);
    }
}
export const store = new _Store();