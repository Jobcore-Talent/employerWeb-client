import React from 'react';
import PropTypes from 'prop-types';
import {withRouter} from 'react-router-dom';
class ButtonBar extends React.Component {

    constructor(){
        super();
        this.state = {
            buttonBarActions: {
                "home": [
                    { slug: "create_shift", title: 'Create shifts', to: 'shifts'},
                    { slug: "invite_talent_to_jobcore", title: 'Invite Talent to JobCore', to: 'talents'}
                ],
                "locations": [
                    { slug: "create_location", title: 'Create a location', to: 'locations'},
                ],
                "shifts": [
                    { slug: "create_shift", title: 'Create shifts', to: 'shifts'},
                    { slug: "filter_shift", title: 'Filter shifts', to: 'shifts'}
                ],
                "applicants": [
                    { slug: "filter_applications", title: 'Filter Applications', to: 'applicants'}
                ],
                "talents": [
                    { slug: "filter_talent", title: 'Filter Talents', to: 'talents'},
                    { slug: "invite_talent_to_jobcore", title: 'Invite New Talent', to: 'talents'}
                ],
                "favorites": [
                    { slug: "create_favlist", title: 'Create Favorite List', to: 'favorites'},
                    { slug: "invite_talent_to_jobcore", title: 'Invite New Talent', to: 'favorites'}
                ],
                "payroll/*": [
                    { slug: "select_timesheet", title: 'Select Timesheet', to: 'payroll'}
                ],
                "profile": [
                    { slug: "manage_locations", title: 'Company Locations', to: 'locations'},
                    { slug: "payroll_settings", title: 'Payroll Settings', to: 'payroll-settings'},
                    { slug: "my_ratings", title: 'Company Ratings', to: 'my-ratings'}
                ]
            },
            currentButtons: []
        };
        this.removeHistoryListener = null;
    }

    getMatchingExpression(actions){
        const path = this.props.history.location.pathname;
        for(let expression in actions)
            if(path.match(expression))
                return expression;

        return null;
    }

    componentDidMount(){

        const key = this.getMatchingExpression(this.state.buttonBarActions);

        this.setState({ currentButtons:  this.state.buttonBarActions[key] });
        this.removeHistoryListener = this.props.history.listen((data) => {
            let key = data.pathname.replace('/','').replace('#','');
            this.setState({currentButtons: this.state.buttonBarActions[key] || [] });
        });
    }

    componentWillUnmount(){
        if(this.removeHistoryListener) this.removeHistoryListener();
    }

    render(){
        const buttons = this.state.currentButtons.map((btn,i) => (<li key={i}>
            <button id={btn.slug} className="btn btn-primary mb-3"
                onClick={() => this.props.onClick(btn)}>{btn.title}</button></li>
        ));
        return (<div className="buttonbar">
            <ul>{buttons}</ul>
        </div>);
    }
}
export default withRouter(ButtonBar);

ButtonBar.propTypes = {
    history: PropTypes.object,
    onClick: PropTypes.func.isRequired
};